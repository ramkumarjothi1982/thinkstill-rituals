# Pilot A: build spec for 1 POP · 109 CLEANSE · 2 CRUSH

**Status:** buildable blueprint, **v2** (2026-10-09). v2 applies the creative critique (`docs/pilot/PILOT_A_CRITIQUE_creative.md`, CR-1 to CR-19) and the engineering critique (`docs/pilot/PILOT_A_CRITIQUE_eng.md`, E1 to E30). §6 records what happened to every item: applied, applied with a change, or rejected, with reasons.
**Binding:** `docs/CREATIVE_STANDARDS.md`. **Starts from:** `docs/QUALITY_REPORT.md` §8 (P1, P3, P5) and §9 (S1-S6).
**Evidence looked at:** contact sheets `dev/shots/quality/sheets/{1,109,2}.png`, rater rows in `docs/quality/batch_1.json` (1, 2) and `batch_8.json` (109), and catalog rows in `catalog_A.md` L61-62 and `catalog_B.md` L144.
**Owner of this file:** the Pilot A lead designer. Builders change the code, not this spec. If the code proves the spec wrong, note the deviation in `docs/pilot/status/<step>.progress.md`.

What today's screenshots show, so builders know what they are replacing:

- **POP (sheet 1):** six blue-purple gradient spheres sit on the shared nebula and ring stage. The words are about 8 px. The right "feel" bubble is clipped at 390. The "+STILL HIT · CHAIN" toast lands on a live bubble. The only characters are blurred red decals at the edges and head-confetti at the finish. The desktop reveal tile has no card.
- **CLEANSE (sheet 109):** six character spheres have "HOLD TO …" pills that float apart from their spheres. On desktop, 5 of the 6 spheres render as empty dark glass. The lotus reads "0%" while the bar reads 100%. The confetti covers the pills. The reveal never appears.
- **CRUSH (sheet 2):** a 30 px face sits in a dark chip between two teal slabs that never move. You tap a full-width "THOUGHT MOVE · CRUSH n/4" pill instead of the object. The bar reads 45% while the counter reads "1/6". On phone, the reveal card and a giant face are clipped off the right edge.
- **All three:** objects labelled "I", "feel" or "me and" become things to pop or crush.

---

## 0. Ground truth from the code (builders must respect these; verified by grep, line numbers as of today)

| # | Fact | Where | Consequence for the pilot |
|---|---|---|---|
| G1 | `dev/pilot_build.py` adds `const PE = EosPilotEngineFor(p.game); if (PE) return <PE {...p} />` at the top of **both** `RoutedGameContentLegacy` (ids < 100: POP, CRUSH) and `RoutedGameContent` (ids ≥ 100: CLEANSE). Both routers are hook-free (L18281, L18911), so the early return is safe. | pilot_build.py `HOOK` | The pilot engine receives the **wrapper's** `ep` props: `game, entries, imageSrc, imageSources, hasUserImages, sfx (wrappedSfx), onDone (wrappedDone), onProgress (reportProgress), reduced, rainSfx, tapOutBpm, bubbleTextPx, variationSeed, finishHoldMs`. |
| G2 | The shell `.cinematicContentShell` renders, in order: the LIVE GUIDE `.globalPlayGuide` (children `.guideAmbient`, `.guideSweep`, `.guideHeaderRow`, the **keyed** `.guideStepCard` with `key=guide-${id}-${guideText}`, and `.globalMindBend` with the MIND BEND line), then the engine's `{content}`. | L18825-18847 (legacy), L20822-20846 (new) | The root **must** be `<div className="arena …">`. Arrows look for `.cinematicContentShell > .arena`. The step card remounts on every guide-text change; the guide container persists, but its height changes when the text wraps. |
| G3 | `wrappedSfx(kind)` calls `p.sfx(kind)`, then `triggerStepReward()` (the "+STILL HIT · CHAIN" toast, haptic and chain HUD) unless the game uses explicit progress and `kind === "soft"`. **For non-explicit games it also adds `gameProgressStep(game)` to the bar.** The step toast lasts 980 ms in the legacy wrapper and 3200 ms in the new one. The new wrapper's step reward also runs `setPositiveSlots`/`setReactionEpoch` and reads `[data-ts-bubble-index]` on pointerdown. | L18554, L19718; `usesExplicitProgress` L3619; L18399 vs L19455; L19532-19542 | POP (1) and CLEANSE (109) are explicit: `sfx` never moves the bar. **CRUSH (2) is not explicit (+15 per sfx call)**. See G4. |
| G4 | In the pilot and release builds, I1-E7/E8 route progress through `eosGateProgress` (60_eos_fixes L47). Engine reports are monotonic (`max(cur, v)`), and each sfx call "creeps" the bar to `min(cur+15, ownReported+12, 96)`. The creep stays below k/N only while the step 100/N > 12, so **N ≤ 6**. | 60_eos_fixes.jsx | **CRUSH rule:** call `p.sfx` **once per word**, at the word's completion, **then** immediately `onProgress(k/N·100)`. Assert N ≤ 6. Every other CRUSH sound goes through `eosTone` (S4). |
| G5 | `wrappedDone` sets the bar to 100, sets the label to `progressLabel(game,100)`, shows the finish copy, plays `sfx("win")` at 0, 170 and 340 ms, and calls the real `onDone` **`finishHoldMs` later**. The root passes `finishHoldMs = 3000` for these ids. `wrappedDone` has `finishLock` and the root `done` has `donePendingRef`. | L18563-18595, L18566, root L22112 | Reveal = pilot hand-off + 3.0 s. The pilot calls `onDone(bonus)` **first**, then `onProgress(100, label)`, so its label is the last write. It never calls `p.sfx("win")`. |
| G6 | The step toast `.globalStepFeedbackCopy` is positioned at the **last pointer position** (`--fx-x` / `--fx-y`, set by `onPointerDownCapture` on the shell). The finish toast `.globalFinishFeedbackCopy` is **pinned to the arena centre** by `.tsArcade.stage-play .globalFinishFeedbackCopy{left:50%!important;top:50%!important;translate:-50% -50%!important}` for the 3 s after the hand-off. 10_eos_readability only resizes their text. | L18435-18456, L18873-18896; `GLOBAL_FINAL_MESSAGE_GUARANTEE_CSS` L21050; readability L139-143 | S6.2 docks both with `EOS_A` specificity on `top`, `left` and `translate`; the `--fx` vars alone cannot move the finish toast. |
| G7 | Arrows (30_eos_arrows `resolve`, L860) check **`[data-eos-target="1"]` markers first for every id**. The fallback (`.arena button:not(:disabled)`, inline `touch-action: none`, …, L148) is reached only when no marker is live **and**, for ids with an `EOS_GESTURES` row (1, 2 and 109 have one), 2.5 s have passed since the arena mounted. `eosTarget(spec)` (core L719-731) maps only `g, dir, d, n, ms, to, bpm, label, win, meter, mvar, armed, maxSpeed, ox, oy` to `data-eos-*`; arrows read the label from `data-eos-label` (L248). A key `L` is silently dropped. `usable()` needs a rect ≥ 12 px (L214). Class words in `EOS_ARROWS_DEAD` (`dead\|gone\|popped\|cut\|loose\|released\|pulled\|done\|moved\|shelved\|…`; `-` counts as a word boundary) mark an element dead; the fallback also matches `[class*=ToolDock\|ToolButton\|ActivateBtn]`. `dev/eos_drive.mjs` `finishGame` uses the same order. | 30_eos_arrows L148, L214, L248, L860-930; eos_drive L278-300 | The pilot marks **exactly one live target** with `eosPilotMarker` (S6.5), using `label`, never `L`. **Do not mutate `EOS_GESTURES`.** The table's selectors (`button.popBubbleV2`, `button.uniqControl`, `button.cleanseBubbleHoldButton`) never match pilot nodes, so markers decide. |
| G8 | The mood flip-bloom (14_eos_mood) fires when `.globalPlayGuide.isComplete` (progress ≥ 100) or `.tsRewardSurge.mega` first appears. It treats `[data-eos-avoid]`, `[data-eos-char]` and visible pictures as obstacles. The colour-script grade (soft-light, z 54) sits over the game for the whole play. | 14_eos_mood header | Progress reaches 100 **only at the hand-off beat**. The finale hero and climax object carry `data-eos-avoid` and `data-eos-char`. In-world palettes are tuned to read under that grade. |
| G9 | `eosTone` and `eosAudio` are gated by `EOS_STORE.get().sound`, which mirrors the arcade sound toggle (I1-E14). `eosTone` schedules at `ctx.currentTime + at` and connects straight to `destination` (no cancel). `eosAudio()` resumes asynchronously and returns null when muted. The arcade `sfx` (`useSfx(sound)`) is gated by the same toggle but owns a **second** AudioContext the pilot cannot see. Arcade kinds: `tap pop soft win chime bell plink clack hum spark tone`. | core L931-964; arcade L2628-2638 | S4 logs both paths; only `eosTone` rows can report audible time. Late cues are scheduled from cancellable timers. |
| G10 | CLEANSE's reveal bug: the finish `useEffect` sets `finishLock`, then schedules `onDone` 2.2 s later. Its cleanup clears that timeout whenever a dependency re-renders, and the lock stays set, so `onDone` never fires. Also 6+ character images decode at once on mount. A 3.2 s visual hold (`cleanseStepVisualHoldMs`) sits between releases. | L6164, L6292-6299 | S2 owns `onDone`. Its timers live in a ref and are cleared **only on unmount**, and the lock is set when the call actually fires. S1 decodes faces before showing them and never shows an empty sphere. |
| G11 | Per-game facts to keep: POP batches words `MAX_VISIBLE_WORD_BUBBLES` (10) at a time, shows "POPPED k / N" and is explicit. CLEANSE takes 6-10 words via `wordsFor`; its pills read `HOLD TO ${releaseEmotionProfile(entries).actions[i]}` (emotion-aware), and it is in `EOS_SLOW_IDS`. CRUSH plays 4 taps per word over every entry ("CRUSH n/4", round "k/6"), is in `EOS_DISCHARGE_IDS`, and its mind bend is "It looked solid. It wasn't." | L4063-4256, L6143-6475, L15078 | See the preserved-features table (§1.3). |
| G12 | The wrapper rebuilds `ep = {...p, sfx: wrappedSfx, onDone: wrappedDone, onProgress: reportProgress}` on **every** render, so the callbacks change identity each time. Renders come from every `p.sfx` (`triggerStepReward`, 4 setStates), every `onProgress` (`setProgress`, `setLabel`, `setGuideText`), the toast-hide timer and, in the new wrapper, `setPositiveSlots`/`setReactionEpoch` (which also hands down a **new** `imageSources` array). | L18597; new wrapper L19859 | The S0 engine shell pattern (§2) is mandatory. |
| G13 | **The reveal unmounts the engine.** The root `done` calls `setStage("reveal")` at once. `stage === "play"` mounts the engine and `stage === "reveal"` renders `.releaseCompleteOverlay` in its place: `rgba(0,5,10,.76)` plus a blur over the generic nebula. The root element carries `className="tsArcade stage-${stage} …"`. | L21540, L22095-22125, L21055, L21837 | The pilot is on screen until hand-off + 3000 ms and never behind the reveal card. Every timeline ends by hand-off + 2900 ms. Only S6.9 (afterglow) reaches the reveal. |
| G14 | The wrapper builds its first guide line in `useState(() => globalReleaseGuideTextLegacy(...))`, **before** its child router renders. `shortHint()` reads `SHORT_HINT` at call time. 60_eos_fixes already merges `EOS_HINT_FIX` at top level (`109: "Hold… then let go slowly"`). | L2186; 60_eos_fixes | Hints are patched once at module top level in `70_pilot_core.jsx` (S6.6), not in render. |
| G15 | Both wrappers run a DOM audit in a layout effect. It tags **any leaf whose text equals an entry** as `.tsExactUserText`; global rules then restyle it (readability `line-height:1.05!important` L99, arcade `font-weight:500!important` under `.releaseGlobal99Upgrade`). The audit retries at 40/120/280/600/1100 ms, re-runs fully on every `progress`, `stepFx` and `finishFx` change, and is re-triggered by MutationObservers: legacy `{childList, subtree, characterData}`, new wrapper plus `attributes:["src"]`. 10_eos_readability observes `childList` and `class`. Each sweep is a `querySelectorAll("span,b,strong,em,button,div,text,tspan")` with text normalisation and rect reads. | L18610-18760, L18754; L19870-20710, L20690; readability L1415 | S6.7 word rule; §2 DOM-mutation rules; arena DOM ≤ 220 elements. Avoid the audits' `bubblePhotoSelectors` and `.uniqWord`, `.uniqArena`, `.uniqStatus` (they trigger photo vars, character bonds and a `translate` auto-lift, L18680-18700). |
| G16 | Reduced motion has two sources: `reduced` = framer-motion `useReducedMotion()` (the OS setting only), and the in-app calm toggle `[data-eos-calm="1"]` on the arcade root. Either can flip mid-game without a remount. | L21058; 12_eos_dots L1200; 60_eos_fixes | Read both per event (§2). |
| G17 | Arcade CSS reaches pilot buttons: `.tsArcade.stage-play .releaseGameHost .arena button:not(:disabled):hover` adds a border and `0 7px 19px rgba(0,0,0,.25)`, a **dark plate under every hovered desktop bubble**; `.releaseGameHost .arena` gets an inset shadow and `isolation:isolate`. | 00_arcade CSS | S6.8 resets pilot hits. |
| G18 | `build.py` rejects `import`/`export` lines in modules and regex lookbehind (iOS < 16.4). Pilot files are copied into the scratch `src/eos/` as 70-74 and sort after 60. A `--dev-dir` build writes the paste-able file as **`/tmp/pilot_<you>/comp.jsx`** (no `ThinkStillReleaseArcade_EOS_FULL.txt`). | build.py L36-46 | §4, §1.5. |
| G19 | Phone 390×844 today: the HUD band ends at y ≈ 95, the LIVE GUIDE spans y ≈ 593-717 and the input bar ≈ 740-780. Together they hold the comfortable thumb zone; today's play box is ≈ y 95-575. | sheets 1, 109, 2 | S6.4 guide dock; §3 layouts put targets low. |
| G20 | `eos_drive` hold with a meter var: it presses until the target's inline var is ≥ 97, for at most `ms·4 + 2200` ms. Taps go out as `clickAt(…, 30)` plus `sleep(110)`, at most 4 per resolve, so ≈ 140 ms apart. | eos_drive L1137-1180, L1005-1014 | CLEANSE's 3 s meter passes; CRUSH must count taps 140 ms apart (E7). |

---

## 1. Goals and acceptance

### 1.1 Goals

Make the three pilot games feel like premium Pixar/Netflix interactive pieces on a phone first. That means five things for each game:

- **Its own world:** an environment kit with depth, light and particles.
- **In-world characters as participants:** they act on every input with varied reactions, the supporting cast reacts too, their faces are driven by progress, and they celebrate in their own way.
- **Its own finale:** its own light source and its own celebration, its single biggest visual change landing on the wrapper's win × 3, under 5 s, safe from reflexive taps, with a reduced-motion variant. The shared bloom and colour grade are supplements only. No sunrise, dawn or lift-off endings.
- **Clear differences from its look-alike cluster.**
- **Thumb-first phone layout:** the targets sit low, in the comfortable thumb zone; the guide yields that zone during play.

At the same time, prove the reusable systems S1-S5 (plus the S6 chrome hooks) so the rollout can reuse them per game, customised and never stamped identically.

### 1.2 Rubric target (phone 390×844 first, desktop 1280×860 second; independent raters; owner approves)

| Axis | POP today | CLEANSE today | CRUSH today | Target, all three, both sizes | What earns it here |
|---|---:|---:|---:|---:|---|
| A Light & polish | 4 | 5 | 3 | ≥ 8 | Key and rim light from one stated direction, materials (soap film, glass and water, brushed steel), static depth of field |
| B Distinct world | 2 | 4 | 2 | ≥ 8 | Sky, pool and workshop kits fill the arena; no nebula or ring stage inside it |
| C Interaction feel | 5 | 5 | 2 | ≥ 8 | Anticipation, squash, impact and recovery on every input; input sound ≤ 15 ms, impact sound on the impact frame; direct manipulation of the object; every tap counts |
| D Characters | 2 | 3 | 2 | ≥ 8 | S1 actors with hands and feet where the role needs them; a varied acting pool (never the same reaction twice in a row); a reacting supporting cast; face steps driven by progress; an own celebration; never ending distressed |
| E Unique finale | 3 | 3 | 2 | ≥ 8 | §3 shot lists: own light, own celebration, peak at T0 + 1300 |
| F Clarity | 6 | 5 | 4 | ≥ 8 | The target is the object; the arrow sits on it; the label is bound to the object; no toast covers it; no object is only "I" or "feel" |
| G Mobile | 3 | 5 | 3 | ≥ 8 | Targets in the thumb zone (F8), ≥ 64 px; words ≥ 15 px; nothing clipped; finale composed for portrait above the guide strip |
| H Relief fit | 5 | 6 | 3 | ≥ 8 | POP: grounding (the hero plants its feet as the pulls go). CLEANSE: a ~3 s inhale and ≥ 2.4 s exhale (≈ 11 breaths a minute). CRUSH: a discharge that squeezes the heat out, never injures, and ends in warmth held in the hands |

### 1.3 Preserved features (Standard 7: redesign, never remove)

| Feature | POP (1) | CLEANSE (109) | CRUSH (2) |
|---|---|---|---|
| Progress bar / HUD (`.engineProgressHud`) | `onProgress` on every pop; label `n% POPPED` | `onProgress` on every release; label `n% CLEANSED` | `onProgress` on every completed word; label `n% CRUSHED` |
| Round / step counter, in step with the bar | `POPPED k / N` pill (same words as today) | `k / N CLEAR` pill (new), plus the lotus petals as an in-world meter | `k / N` round pill, `CRUSH n/4` on the press gauge, and 4 pips on the word tag |
| LIVE GUIDE + MIND BEND (wrapper) | Phone: docked to a 44 px strip during play showing the hint line; a tap expands the full card (MIND BEND included); from the hand-off the strip shows the MIND BEND line (S6.4). Desktop: unchanged. Hint "Tap a bubble to pop it" | same; hint "Hold an orb, breathe in… then let go" | same; hint "Tap the blob: 4 slams each" |
| Guide arrows (30_eos_arrows) | marker `{g:"tap", label:"POP IT!"}` on one bubble | marker `{g:"hold", ms:3000, mvar:"--hold-pct", label:"BREATHE IN… LET GO"}` on one orb | marker `{g:"taps", n:4, label:"CRUSH ×4"}` on the press mouth; then `{g:"tap", label:"ONE BIG SLAM"}` |
| Sound + sound toggle | `p.sfx("pop")` on each pop, plus `eosTone` layers | `p.sfx("soft")` at hold, `p.sfx("pop")` at release, plus `eosTone` layers | `eosTone` per slam, plus **one** `p.sfx("pop")` per word (G4) |
| Step reward toast, chain HUD, haptics | kept (via `p.sfx`); toast docked under the HUD (S6.2) | kept; docked; a quieter toast style in this game (CR-11) | kept, **once per word**; docked |
| Reveal hand-off | S2 `onDone` once; reveal ≈ 4.3 s after the last input; the reveal is tinted with the game's afterglow (S6.9) | **fixed** (G10); afterglow | kept; afterglow. The phone reveal overflow is W0-2's job (§1.5) |
| User's own words ≥ 15 px | on the soap film, 15-17 px, dark ink | below each orb, 15 px, plus the action caption at 13 px | on a stamped tag below the blob, 15-17 px |
| Word chunks (CR-7) | No object is only a pronoun, function word or feeling verb; such chunks merge into a neighbour and every token still shows (§3.0) | same | same |
| User-uploaded images (`hasUserImages`, image-only entries) | an image fills the bubble or the hero ball (circular) | the image replaces the orb's face | the image replaces the blob's face |
| Emotion-aware copy | — | `hold to <action>` captions from `releaseEmotionProfile(entries).actions`: full strength on the marked or held orb, 0.5 opacity on the others | — |
| Word batching | waves of ≤ 6 bubbles (today: batches of 10, kept as waves) | waves of ≤ 6 orbs | rounds = entries (≤ 6; the tail is joined on the last tag, wrapped) |
| Hero name | label at the start and in the tableau only (CR-18) | the protagonist's name at the start and in the tableau | the hero's name at the start and in the tableau |
| Shared supplements | mood grade, flip bloom, Still Point dust, check-in and shift meter, rewards: all untouched | same | same |
| Safety | words via `eosWords` (neutral words under strong flags) | same | same |
| Keyboard | Tab to a bubble, Enter/Space pops it | Space/Enter held = hold, Escape cancels | Enter/Space = slam |
| `?pilot=off` / `localStorage eos_pilot=off` | the original game | the original game | the original game |

### 1.4 Acceptance checks (each must pass at 390×844 **and** 1280×860)

- **F1 Plays through.** `finishGame(page, id)` reaches the reveal with `assertArrows:"auto"` and no page errors. Run it for word counts N = 1, 3, 4, 5 and 6 (after merging, §3.0) and once with a 12-word input (waves). Also play once by hand (a scripted pointer sequence) in reduced motion and once with the in-app calm toggle on.
- **F2 Progress.** `progressLog` is monotonic.
  - During play, `|bar − k/N·100| ≤ 100/N`.
  - The last input reports `EOS_PILOT_FINAL_PCT` (96). Exactly 100 arrives only at the hand-off, and the label then reads `100% <VERB>` (not the wrapper's default).
  - CRUSH holds 96 from the last word's 4th slam until the hand-off.
- **F3 Hand-off and skip.** `onDone` fires exactly once. Last input → hand-off is 1300 ms (800 in reduced motion), so the reveal follows ≤ 4.5 s after the last input.
  - Taps in T0 … T0 + 800 never skip. They play the game's finale-tap effect and log `action:"finale-tap"`.
  - After T0 + 800, a tap that comes ≥ 400 ms after the previous tap skips to the hand-off.
- **F4 Arrows.** While play is live, a marker sits on an **enabled** live target, `arrowState(page)` aims inside its rect, and the arrow shows the spec's label.
  - In no-live windows (POP wave change ≤ 0.6 s, CRUSH round change ≤ 0.7 s and finale set-up, every finale), the play plane carries `isLocked` and every hit is `disabled`, so no fallback arrow can appear.
  - `disabled` is never toggled, and the marker never moves, on an element that holds pointer capture.
- **F5 Switch.** `launchEos({query:"pilot=off"})` plays the original for each id.
- **F6 Sound.** `eosApi("pilot").soundLog()` holds one row per layer, grouped by `evId`.
  - Input latency: `dt − at·1000 ≤ 15 ms` (p95; report the max) for every input-driven layer.
  - Impact sync: `|dtAudible − impactT| ≤ 20 ms` (p95) for layers marked `impact`.
  - Rows with `ctxState !== "running"` are flagged and reported. Arcade rows report `audible:"unknown"`.
  - With sound off, rows log `muted:true` and no AudioContext output happens.
- **F7 Reduced motion.** With `reducedMotion:"reduce"`, and separately with the calm toggle switched on mid-game: no running transform animation on actor bodies (arena-scoped `document.getAnimations()`). Faces and progress still change; the finale cross-fades.
- **F8 Thumb zone (390×844).**
  - The marked target's centre is at y ≥ 400 at every sampled moment of play.
  - POP and CRUSH: no live target centre above y 330.
  - CLEANSE: front-row centres ≥ 480; back-row centres ≥ 280 (holds are slow and deliberate; the suggested order starts in the front row).
  - During play the guide is a ≤ 44 px strip unless the player opened it.
- **F9 Peak timing.** Each game's biggest visual change lands at T0 + 1300 ± 60 ms: on the finale frame strip, the largest frame-to-frame change between T0 and T0 + 2600 falls in that window. Everything except idle loops settles by T0 + 2600.
- **F10 Acting.** In the phone recording, no two consecutive inputs of the same type produce the same face-plus-motion pair, and every input visibly moves at least one supporting element (POP neighbouring bubbles, CLEANSE sympathetic breathing, CRUSH gallery audience).
- **F11 Distinct endings.** The finale frames (T0 + 0.3 / 0.9 / 1.3 / 1.8 / 3.0 s) of the three games, side by side, share no dominant hue and no repeated hero pose. None shows a sunrise, a dawn sky or a lift-off.
- **V1 Text sizes.** Checked ≥ 1.2 s after mount and ≥ 1.2 s after each progress step (the audits retry until 1100 ms, G15): `smallText(page, 12)` returns nothing in the pilot arena, and every user word is ≥ 15 px and weight 800 (computed), even where it carries `.tsExactUserText`.
- **V2 Bubble rules.**
  - Every actor image is circular (`border-radius: 50%`, `overflow: hidden`) with no dark plate behind it: the ball's own background luminance must be ≥ that of the stage behind it. Desktop hover adds no shadow (G17).
  - Every label is below its image with a gap ≥ 4 px, and no rects intersect.
  - Every actor and target rect lies inside the arena rect at both sizes, including sway and squash extents.
  - The afterglow face on the reveal (S6.9) is circular, with all text below it.
- **V3 Toasts and guide.** No `.globalStepFeedbackCopy` or `.globalFinishFeedbackCopy` rect intersects the live marker's rect, the finale hero's rect, the climax object's rect or `.engineProgressHud`. This includes the step toast that the 96 at the last input can raise 1.3 s before the finish toast. The guide strip never intersects the finale hero.
- **P1 Performance.**
  - ≤ 40 running animations whose `effect.target` lies inside the arena, at any sampled frame of play and of the finale.
  - Only `transform` and `opacity` are animated. The only repeated inline write is `--hold-pct` at ≤ 20 Hz. No `backdrop-filter`, no live `mix-blend-mode`, no animated `filter`, no `clip-path` animation in the pilot.
  - DOM: `arena.querySelectorAll("*").length ≤ 220`, and no `childList`, `characterData` or `src` mutation per frame or per hit.
  - Layers: ≤ 12 `will-change` nodes and ≤ 2 full-arena composited layers. Frame times are measured with the mood grade on and off.
  - Commits: ≤ 1 synchronous React commit per input, and the pilot's inner tree re-renders 0 times on wrapper-only commits (`<React.Profiler id="pilot">` in the dev build; `onRender` is a no-op in production).
  - No input-caused long task > 200 ms (`PerformanceObserver("longtask")`, Chrome; headless caveat recorded).
  - ≤ 20 decoded face images at any moment on phone.
- **Premium.** Independent raters re-score phone first: ≥ 8 on every axis A-H. The owner plays the build and approves.

### 1.5 Approval package (CREATIVE_STANDARDS "Pilot approval package")

For each game, the reviewers produce:

- before/after shots at 390 and 1280 for start, mid, finish and reveal, plus five finale frames (T0 + 0.3, 0.9, 1.3, 1.8, 3.0 s);
- the playable build (`/tmp/pilot_<you>/index.html`) and the paste-able Framer file (`/tmp/pilot_<you>/comp.jsx`, G18);
- a phone-size recording of the full game and finale;
- an Event Timing input-latency table and a frame-time distribution (p50 / p95 / long frames) for play and finale, with the mood grade on and off;
- the sound log (§2 S4) with `ctxState`, `lat` and `dtAudible`;
- the distinctiveness paragraph (the last item of each game section below);
- the **known leftovers**, re-shot and labelled as not pilot regressions (CR-19): CRUSH's phone reveal clipping (sheet 2 `390_reveal`), the missing desktop reveal card (sheet 1 `1280_reveal`) and the clipped header ("MOTIONAL RELEASE CONSO"). These are W0-2 or shared-chrome items;
- the afterglow (S6.9) before/after reveal shots, for the owner's sign-off.

---

## 2. Shared systems API (file `src/pilot/71_pilot_fx.jsx` unless noted)

**Conventions for all of S1-S6:**

- No `import`/`export` lines and no regex lookbehind (G18). Every top-level name is prefixed `EosPilot`, `eosPilot` or `EOS_PILOT`.
- Read-only use of core and arcade globals: `React, EOS_A, EOS_EMO, EOS_GUIDE_CHAR, EOS_CHAR_NAMES, EOS_WIN_FACES, eosFace, eosFacePool, eosCurrentEmotion, eosDetectEmotion, eosWords, EosWord, eosTone, eosNote, eosAudio, eosHaptic, EOS_HAPTIC, eosBreathOwn, eosTarget, eosCss, eosExpose, eosApi, eosIsDev, eosNoise, eosClamp, EOS_STORE, isImageOnlyEntries, releaseEmotionProfile, displayText, pct`. **No framer-motion in the pilot:** WAAPI only, so per-frame JS stays at zero and nothing writes `transform` twice.
- CSS goes in through `eosCss("<name>", css)` **at module top level only** (calling it at runtime re-renders the single global `<style>`); dynamic values are CSS vars. Every selector is scoped under `${EOS_A} .eosPilotArena`, except the S6 chrome hooks, which are scoped by the attributes the pilot sets on the shell or the root. Use classes for `touch-action`, `user-select` and the hold cursor, never inline styles (G7).
- **S0 · Engine shell pattern (mandatory, G12).** Each engine is a thin outer component plus a memoised inner tree:

  ```jsx
  function EosPilotPopEngine(p) {                      // re-renders with the wrapper, costs ~nothing
    const live = React.useRef(p); live.current = p     // sfx/onDone/onProgress always called as live.current.x(...)
    const wordsKey = (p.entries || []).join("\u0001")
    return <EosPilotPopInner live={live} gameId={p.game.id} wordsKey={wordsKey}
             reduced={!!p.reduced} userImgKey={p.hasUserImages ? eosPilotImgKey(p) : ""} />
  }
  const EosPilotPopInner = React.memo(function EosPilotPopInner(props) { /* primitives + one stable ref */ })
  ```

  - Never put `sfx`, `onProgress` or `onDone` in effect dependencies (the G10 bug class).
  - Memoise words on `wordsKey`, never on the `entries` array identity.
  - Snapshot user images once at mount (they rotate in the new wrapper).
- **Refs, not state, for motion.** Per-frame and per-event visuals use WAAPI or CSS vars and attributes written straight to the DOM. React state changes at most once per input (counter, phase); CRUSH changes it once per word.
- **DOM mutation rules (G15).**
  - Particle pools (droplets, shards, ink, goo, sparks, fireflies) are mounted once and recycled with WAAPI.
  - Face `<img>` nodes have fixed sources: each node gets its `src` exactly once (from empty, when it enters the decode window, S1) and never changes. A new character is a new actor node, mounted only at a round or wave boundary.
  - Per-hit state goes on `data-*` attributes and CSS vars, **not classes** (readability observes `class`). Classes change only at lifecycle moments (`isGone`, once per object; `isLocked` on the play plane).
  - Text that changes per hit is an attribute shown by `::after { content: attr(data-n) }`.
  - Arena DOM ≤ 220 elements.
- **Animation helper.** `eosPilotAnim(el, keyframes, opts)`:
  - registers the animation in the engine's `anims` Set (a ref) and removes it on `finish` or `cancel`;
  - defaults to `fill: "none"`, with the end state committed before the animation starts (attribute or CSS var), so nothing jumps at the end and nothing piles up in `getAnimations()`;
  - `eosPilotAnimSkip(set)` calls `finish()` on finite and `cancel()` on infinite animations, each in try/catch;
  - unmount cancels everything.
- **Reduced motion (G16).** `isReduced = live.current.reduced || !!arena.closest('[data-eos-calm="1"]')`, read on every event, never once at mount. CSS idle loops stop under both `@media (prefers-reduced-motion: reduce)` and `${EOS_A}[data-eos-calm="1"] .eosPilotArena`. On a flip mid-game, running loops are cancelled.
- A user's words render only through `<EosWord>` with the class `eosPilotWord`, inside a container that spreads `EOS_PRIVATE_ATTRS` (S6.7 styles them).

### S1 · `EosPilotActor`: the character rig and acting layer

```jsx
const actor = React.useRef(null)
<EosPilotActor
  ref={actor}                    // React.forwardRef → imperative handle (below)
  role="holder" | "inside" | "breath"
  emotion={emotionId}            // EOS_EMO id; default eosCurrentEmotion() || "auto" (STILL)
  char={undefined}               // override: sync|rush|glitch|loopie|drop|patch|still
  image={null}                   // user-uploaded src; replaces the face, steps then show via halo/tint/pose
  size={112}                     // px at a 390-wide arena; actual = size × clamp(u, 0.85, 1.35), u = S5 box scale
  progress={0}                   // 0..100 → face step (≤ 1 prop change per input)
  reacts={["brace","wow"]}       // reaction faces this actor may show; only these get img nodes
  label={undefined}              // caption BELOW the ball (≥ 13 px; a user word uses EosWord at ≥ 15 px)
  showLabel={true}               // CR-18: name labels show at the start and in the tableau only
  sub={undefined}                // second caption line (e.g. CLEANSE "hold to calm"), ≥ 13 px
  avoid={true}                   // data-eos-avoid + data-eos-char for the mood bloom (G8)
  className, style               // placement: left/top % of the play box via CSS vars
/>
```

**DOM (fixed, so every game composes the same way):**

```
.eosPilotActor[data-role][data-step][data-react][data-look]
  .eosPilotActorPos                      placement translate
    .eosPilotActorIdle                   CSS idle loop + quirk
      .eosPilotActorBody                 WAAPI reactions; transform-origin bottom-centre
        i.hand.l  i.hand.r               holder and inside roles
        i.foot.l  i.foot.r               holder role
        .eosPilotActorBall
          .eosPilotActorFace             look offset (±6 px) and "widen" scale
            img[data-k="loud|soft|calm|win|<reacts…>"]   fixed src, stacked
          i.gloss  i.under  i.quirk  (+ role parts)
    .eosPilotActorLabel                  sibling of Body, so text never squashes
```

- The visible face is the `data-react` key when set, else the `data-step` face. CSS cross-fades the stacked images by opacity: 240 ms for steps, 90 ms in and 120 ms out for reactions.
- **Hands** (CR-4c): two 18 px circles in the character's hue with a light rim (never a dark plate), placed by role vars. **Feet** (holder only): two 16 × 10 px ovals. Poses are WAAPI transforms on the nubs only.
- `i.under` is a warm under-light (CRUSH finale): a radial gradient in the lower half of the ball, opacity only.
- The label sits ≥ 6 px below the ball and has no background box (text-shadow only).

**Ball:** `border-radius: 50%; overflow: hidden`, a light glass gloss (a radial highlight at the kit's key-light position, `--eos-pilot-key-x/y`), and a rim light from `--eos-pilot-rim`. **Never a dark plate, capsule or square.**

**Rig vocabulary.** Storyboards may only use what the rig can do: lean, look (face offset ± 6 px toward a target or the camera), squash and stretch, hop, spin, sit, swap face, hand poses (raise, press, wave, cup) and feet (plant, widen, tuck).

**Imperative handle**

| Method | Effect | Default timing (games may override) |
|---|---|---|
| `emit("press", {dir:[x,y]})` | anticipation: squash to 0.92 × 1.08, lean 4° toward `dir`, face "widen" (face scale 1.04) | 80 ms, ease-out |
| `emit("lurch", {dir, s})` | holder: a pendulum away from `dir`, rotating ∓(6 + 6s)° about the feet with a spring, then the feet re-plant (2 frames) | 300 + 120 ms |
| `emit("squeeze", {c, heavy, variant})` | inside: compress to `c` (scaleY 1 → 0.22, scaleX 1 → 1.5 about the bottom) with a variant wobble (`left`, `right` or `twist`) | impact 0-60 ms, recover to the cycle end |
| `emit("hit", {s, dir})` | generic recoil (squash 1+0.15s × 1−0.15s, spring back, shake if s > 0.7). Kept for the rollout; **no pilot game uses it** (it reads as hurting the character, CR-8, CR-12) | 0-420 ms |
| `emit("miss", {dir, variant})` | `shake` (head-shake ±6°) or `tilt` (head tilt toward the tap); the game supplies the face | 200 + 600 ms |
| `emit("inhale", {ms, amp})` | breath role: WAAPI scaleY 1 + 0.08·amp, scaleX 1 − 0.04·amp over `ms` (amp 0.3 for sympathetic breathing) | `ms` |
| `emit("exhale", {ms, amp})` | squash-y 0.92 → stretch 1.04 → settle, plus one pooled sigh puff | `ms` |
| `emit("hop", {px, ms})` | a hop | 12 px, 260 ms |
| `emit("popBack")` | inside: 0.22 → 1.15 → 1 spring | 420 ms |
| `react(key, ms)` | shows a reaction face for `ms` (150-450), then returns to the step face; a no-op if that face is not decoded yet (the motion still plays) | — |
| `look(target)` | face offset ± 6 px toward an element; `"camera"` = centred plus scale 1.03; `null` = rest | 160 ms ease |
| `pose(name)` | named hand and feet poses: `raise`, `press`, `wave`, `cup`, `sitCross`, `plant`, `tuck` | 200-400 ms |
| `setTug(t 0..1)` | holder: sway amplitude 6°·t; period 1.6 s → 3.2 s as t falls | CSS vars |
| `setStance(w 0..1)` | holder: feet spread ± (6 + 10w) px; sway damped by w | CSS var |
| `setCompression(c 0..1)` | inside: hold a compression (reduced motion uses 4 pre-composed states) | 0-60 ms per change |
| `setHeat(h 0..1)` | inside: two stacked rims cross-fade from angry red to the character's calm hue | 120 ms |
| `celebrate(steps)` | runs the game's own choreography, a list of `{at, part, keyframes, opts}`. There is **no shared jump-spin** (CR-1) | per game |
| `anchor(name)` | `{x, y}` in arena px for `"hands"`, `"centre"`, `"top"`, `"feet"`, `"lap"` | — |
| `el()` | the root element (for rects) | — |

**Acting pool (CR-4b).** `eosPilotPick(pool, lastRef, seed)` picks a variant other than the last one. Each input type in §3 lists 3-4 variants; a variant is a `{face, motion}` pair. F10 checks the result.

**Face step (driven by progress, never by the word):** `eosPilotFaceStep(p)` returns:

- 0 (loud) for 0-33;
- 1 (soft) for 34-66;
- 2 (calm) for 67-99;
- 3 (win) only from the hand-off (S2).

`eosPilotFaceSrc(char, step, emotion)` gives:

- step 0: `EOS_EMO[e].loud` (else `EOS_GUIDE_CHAR.loud`);
- step 1: `EOS_PILOT_SOFT_FACE[char]` (start from the first id of `eosFacePool(char,"positive")` that is not the calm id);
- step 2: `EOS_EMO[e].calm`;
- step 3: `EOS_WIN_FACES[char][seed % n]`, preferring a closed-eye smile where the celebration calls for one (POP).

**Reaction faces (CR-4a).** `EOS_PILOT_REACT_FACE[char] = { brace, wow, phew, giggle, pfff, grin, curious }`, picked from the 64 expressions each character already has (`bubble-expressions/<char>_E01..E64`, from `thinkstill_750_expression_map.json`). **The builder picks the 7 soft faces and the reaction faces on one contact strip per character** and records the ids in `71_pilot_fx.jsx` and the progress note. Each game uses only what it needs: POP `brace, wow, phew, giggle`; CLEANSE `phew`; CRUSH `brace, pfff, grin, phew, curious`.

With a user image, the face stays; steps show as halo warmth (glow hue loud → calm), posture (the tilt eases) and the end of the quirk; reactions are motion only.

**Decode policy (E14).** The faces are 512 × 512 webp, about 27 KB each, about 1 MB each once decoded.

- At mount, decode each actor's current step face, plus the reaction faces of the actor that plays first.
- Decode an actor's next step face once progress is within one step of it.
- Decode win faces once progress ≥ 67, which leaves seconds before the finale.
- Decode a CLEANSE orb's `phew` when its hold starts (a hold lasts ≥ 850 ms).
- `decode()` has a 1200 ms timeout: if it times out, show the face when `img.complete`; otherwise keep the hue gradient and the character's initial. **Never an empty dark sphere** (G10).
- Pre-fetch (without decoding) the remaining faces at idle. At most 20 decoded faces at once on phone; if a game needs more, reaction faces are dropped first (their motion stays). Drop the refs on unmount.

**Idle quirks** (≤ 3 nodes, CSS only, fading out by step 2):

| Character | Quirk |
|---|---|
| RUSH | 2 steam puffs |
| SYNC | heartbeat scale pulse 110 → 60 bpm with progress |
| GLITCH | 1.5 px `steps(2)` jitter |
| LOOPIE | a slow spiral glyph above the head |
| DROP | one sliding tear |
| PATCH | the hand nubs cover the face and lower with progress (needs the holder or inside role; in the breath role, two painted hands inside the ball) |
| STILL | soft glow |

Idle breathing is scale-y 1 → 1.03 over 2.4 s.

**Reduced motion:** no Body, Idle or nub transforms; faces (including reaction faces), halo and labels still step; reactions become a 120 ms brightness (opacity) flash.

### S2 · `useEosPilotFinale`: the finale sequencer

```js
const fin = useEosPilotFinale({
  arenaRef,                       // writes data-eos-pilot-beat="climax|transform|peak|afterglow|tableau" on the arena
  live,                           // live.current.onDone / onProgress (S0)
  bonus,                          // number passed to onDone
  label: "100% POPPED",
  kit: "sky", heroFace: () => src, // for the afterglow (S6.9)
  anims, timers,                  // the engine's Set and timer ref
  handoffMs: EOS_PILOT_HANDOFF_MS,          // 1300 (reduced: 800)
  beats: [                                   // run(ctx) does DOM/WAAPI work only; ctx = {t0, reduced, arena, skipped}
    { id: "climax",    at: 0,    run },      // the game's own climax
    { id: "transform", at: 350,  run },      // the game's transformation
    { id: "peak",      at: 1300, run },      // the single biggest visual change; lands with the wrapper's win × 3
    { id: "afterglow", at: 1300, run },      // the game's own celebration; the grade completes here as a supporting move
    { id: "tableau",   at: 2600, run },      // final composition reached; idle loops only from here
  ],
  onFinaleTap(ev),                // the game's small play-along effect for early taps
})
fin.start(inputEvent)   // idempotent; T0 = inputEvent.timeStamp (S4 sanity rule), else performance.now()
fin.tap(ev)             // the arena's pointerdown while phase === "finale" (see Skip)
fin.phase               // ref: "play" | "finale" | "done"
```

**Hand-off** (at `handoffMs`, in this order):

1. `live.current.onDone(bonus)`, then `live.current.onProgress(100, label)` (G5: the pilot's label is the last write; `v = 100` raises no step toast).
2. Face step 3 for the hero.
3. S6.9 afterglow attributes on the root; S6.4 guide strip switches to the MIND BEND line.

**Guarantees**

- `onDone` is called exactly once. The lock is set inside the call that fires it.
- All timers live in a ref and are cleared **only** on unmount (G10). Timed sound cues are scheduled from the same ref (S4), so they stop on skip and unmount.
- A watchdog at `handoffMs + 800` runs the hand-off if a beat threw (each `run` sits in try/catch).
- Beats never wait on, or read, React state.
- **Every beat ends by hand-off + 2900 ms**, because the engine unmounts at hand-off + 3000 (G13). Nothing is composed for the reveal card; only S6.9 reaches the reveal.

**Time budget**

- Last input → hand-off: 1.3 s. The hand-off → reveal is the wrapper's 3.0 s hold, so last input → reveal is **4.3 s ≤ 5 s** (reduced: 3.8 s).
- At the hand-off the shared systems join as **supplements**: win × 3, the finish copy (docked by S6.2), the mood flip bloom (it avoids our `data-eos-avoid` hero and climax object), and the Still Point dust gathering.

**Grade rule (CR-1).** `stage.grade()` is a supporting move only: the calm layer goes from its play value (≤ 0.7) to at most 1.0, an opacity change ≤ 0.4. It is never a named shot, and no pilot grade is a sunrise or dawn.

**Skip (CR-6).** While `phase === "finale"`, the arena's `onPointerDown` calls `fin.tap(ev)` (no button, see G7):

- before T0 + 800: `onFinaleTap(ev)` plays the game's small effect and logs `action:"finale-tap"`; nothing is skipped;
- from T0 + 800, if the tap comes ≥ 400 ms after the previous tap: `eosPilotAnimSkip` on the pre-hand-off beats, every pre-hand-off end state is committed, and the hand-off runs now;
- after the hand-off, taps do nothing (the wrapper owns the reveal timer).

**Reduced motion:** every `run` gets `ctx.reduced`. Beats become opacity cross-fades of pre-composed end states, the peak and the hand-off move to 800 ms, and the afterglow and tableau follow at 800 and 1600.

### S3 · `EosPilotStage`: environment kit and lighting rig

```jsx
const stage = React.useRef(null)
<EosPilotStage ref={stage} kit="sky" | "pool" | "workshop" reduced calm={progress / 100}>
  {/* play plane */}
</EosPilotStage>
stage.current.grade(to 0..1, ms)          // supporting move only (S2 grade rule)
stage.current.camera({ y, scale, ms })    // WAAPI translate on prop nodes × depth factor
stage.current.particles(name)             // the kit's pooled particle set (≤ 16 nodes), see EosPilotParticles
stage.current.burst(poolName, {x, y, n, spread, ms, hue})   // reuses pooled nodes, never mounts new ones
```

**Layers (absolutely positioned inside `.arena`, `overflow: hidden`). Promote only what animates (E13):**

| Layer | Contents | Composited? | Camera depth factor |
|---|---|---|---|
| L0 backdrop | **one static node**: the loud gradient, vignette, key-light glow and pre-blurred far shapes painted together | no `will-change` | 0.1 |
| L0 calm | the calm gradient; the only full-size opacity layer; opacity `calm × 0.7` during play | `will-change: opacity` only while `grade()` runs | 0.1 |
| L1 / L2 props | individual prop nodes (sun, moon, clouds, panels, reeds), each drifting on its own transform (18-40 s loops, translate only) | small layers per node | 0.3 / 0.6 |
| Play plane | the game's objects and actors | per animated node | 1 |
| L4 foreground | ≤ 2 bounded mist or bokeh plates (pointer-events none) | yes | 1.3 |

- Caps: **≤ 12 `will-change` nodes; ≤ 2 full-arena composited layers** (the CLEANSE mirror plate is bounded to the water and counts as the second).
- One promoted full-arena layer at 390 × 844 and DPR 3 is about 11.8 MB, and the mood grade (G8) recomposites everything beneath it on every animated frame. Measure frame times with the grade on and off.
- The wrapper's `CinematicStageFX` and nebula keep animating under the opaque arena. Measure that cost; if it is significant, the owner decides about pausing them (`animation-play-state`, never hiding) while a pilot arena is mounted (risk 7).

**Light rig:**

- A key light: a pre-blurred radial gradient placed by `--eos-pilot-key-x/y`, which also positions every gloss highlight.
- A rim light: `--eos-pilot-rim` colour and `--eos-pilot-rim-side` (`left` or `right`), used by object rims as inset shadows.
- A static vignette (part of the L0 backdrop node).

**Bans:** `backdrop-filter`, live `mix-blend-mode`, animated `filter`/blur, `clip-path` animation and layout-property animation. Depth of field is static: far shapes are pre-blurred radial gradients. The environment covers the shared nebula and edge decals **inside the arena only**. That is the S3 replacement named in QUALITY_REPORT §9; the decals' role moves to in-world characters.

**Kits.** Each kit resolves through a different physical light (CR-1). None of them ends in a sunrise or dawn.

| Kit | L0 loud → calm | L1 / L2 props | Key light | Rim | Particles (pooled) |
|---|---|---|---|---|---|
| `sky` (POP) | hazy lilac `#6F6A9E → #A49AC4 → #D9C8DC` → clear high sky `#4FA8EC → #9AD4F6 → #E6F5FF` (no gold band) | L1: sun disc upper-left (behind haze at first), 3 far cumulus; L2: 2 near clouds, 2 bird silhouettes (≥ 67%). The hero's cloud-top is part of the play plane | the sun, upper-left (10 o'clock), white-warm `#FFF4DA` | cool sky `#9FD8FF`, right | 6 motes; 16 droplets; 1 rainbow caustic band (finale) |
| `pool` (CLEANSE) | murky night: violet haze `#1A1838 → #2E2A55`, water `#16173A`, thick mist → **clearest night**: deep indigo `#070D2A → #18265E`, mirror water `#0B1236`, sharp stars | L1: moon upper-right and its reflection, 6 stars (6 mirror twins in the finale), far tree line; L2: reeds, lily pads, the lotus, 2 mist bands, the moon path (finale) | the moon, upper-right (1-2 o'clock), cool `#CFE3FF`; at the peak the lotus's gold `#FFD37A` becomes a low warm key from the lotus | silver-blue `#AFC8FF`, left | 3 ink puffs (+2 for a deep clear); 6 fireflies; 3 ripple rings |
| `workshop` (CRUSH) | sodium-lit steel `#3A2A2E → #5A3A3A`, night windows `#1B2440` → warm tungsten `#4A4038 → #6A5242`; the windows **stay night** `#1E2A4C` with 3 stars | L1: back wall of brushed-steel panels, 3 tall windows, pipes, gauges, red beacon (conic, rotating); L2: press frame (columns, crossbeam, piston), anvil, conveyor, gallery shelf, heat tray | overhead hanging lamp, a cone onto the anvil, `#FFB060` (loud) → `#FFD08A` (calm); at the peak the core `#FFC46A` becomes a warm under-light from the hero's hands | window light, upper-left, cool `#7FA6D9` (it stays cool: the warmth comes from the core) | 6 lamp-cone dust motes; 10 heat drops (red-hot goo); 12 sparks; 3 steam puffs |

Palettes are tuned to read **under** the mood grade (G8): the pilot's calm layer runs at 0.7 opacity during play, so the in-world change and the shared grade do not double-saturate. Verify on one contact sheet per kit.

### S4 · `useEosPilotSound`: named cues, layer sets and the sync log

```js
const snd = useEosPilotSound({ gameId, live, cues: EOS_PILOT_CUES[gameId], timers })
snd.cue("pop", e, { chain: 3 })   // one event → one log row per layer, sharing an evId
// cue definition: a cue is a SET OF LAYERS (E17)
EOS_PILOT_CUES[1] = {
  pop:  [ { arcade: "pop" },
          { tone: (o) => [eosNote(o.chain, 523), 120, { type: "sine", gain: 0.035, at: 0.03 }] } ],
  miss: [ { tone: [220, 90, { type: "triangle", gain: 0.03, glide: 180 }], haptic: 8 } ],
  ...
}
snd.later("exhale", 420, T0)      // timed cue from the timer ref (cancelled on skip and unmount)
```

- A layer is `{arcade: kind}` (calls `live.current.sfx(kind)`), `{tone: [freq, ms, opts] | (o) => …}` (calls `eosTone`), `{haptic}` (calls `eosHaptic`), or a mix. A layer flagged `impact: true` is checked against its impact frame.
- **Input-driven layers fire synchronously inside the pointer handler**, never from effects. A layer may use `at ≤ 0.03` s only to land on an impact frame. Anything later is scheduled with `snd.later` from the timer ref, because `eosTone` cannot be cancelled (G9).
- **Warm-up:** the arena's first pointerdown calls `eosAudio()`, so the context is created and resumed inside a user gesture (iOS).
- **Phone speakers (CR-15):** any cue whose fundamental is below 150 Hz also gets a 140-220 Hz body layer and a 2-4 kHz click transient (≤ 10 ms).
- **CRUSH:** `arcade` is allowed only for the per-word `"pop"` (G4). No pilot calls `sfx("win")` (G5).

**Log:** `EOS_PILOT_SOUND_LOG` is a ring buffer of 400 rows (cheap enough to keep in production):

```
{ t, evId, action, cue, layer, via: "arcade" | "tone", inputT, dt, at,
  ctxState, lat, audT, dtAudible, audible, impact, impactT, queued, muted, tsFallback, game }
```

- `inputT` = `e.timeStamp`. If `|e.timeStamp − performance.now()| > 5000` (old WebKit epoch stamps, synthetic events), use `performance.now()` and set `tsFallback`.
- `t` = `performance.now()` at scheduling + `at·1000`; `dt = t − inputT`.
- `ctx = eosAudio()`: null when muted, which logs `muted:true` (rows are still logged; no audio plays).
- `ctxState = ctx.state`; `lat = (ctx.baseLatency || 0) + (ctx.outputLatency || 0)`; `audT = ctx.currentTime + at`.
- `dtAudible`: with `ctx.getOutputTimestamp()`, `perf = ts.performanceTime + (audT − ts.contextTime)·1000 + lat·1000`, and `dtAudible = perf − inputT`; otherwise `(now − inputT) + at·1000 + lat·1000`.
- `via:"arcade"` rows log `audible:"unknown"`: they play on the arcade's own AudioContext (G9).
- `impactT` (impact layers): the impact frame time relative to `inputT`, from the animation's `startTime` plus its impact offset.
- Timed cues log `action: "timed:<beat>"` with `inputT = T0`.

Exposed as `eosExpose("pilot", { soundLog: () => rows.slice(), clearSoundLog })`, so in dev builds it is `window.__eos.pilot.soundLog()` (dev = `eosIsDev()`).

**Targets:** F6.

### S5 · `useEosPilotGesture` and `useEosPilotBox`: gestures and the play box

```js
const bind = useEosPilotGesture({
  kind: "tap" | "hold",
  holdMs: 850,                    // hold: acceptance threshold (silent; release after it counts)
  fillMs: 3000,                   // hold: the full-breath fill; the meter reaches 100% here
  fillVar: "--hold-pct",          // written on the bound element at ≤ 20 Hz from the fill animation's currentTime
  onDown(e, info),                // tap: fires the action on pointerdown (latency); hold: start
  onHoldReady(info),              // threshold crossed (still pressed)
  onHoldFull(info),               // fillMs reached (still pressed)
  onHoldDone(e, info),            // released after the threshold; info.full = released after fillMs
  onHoldCancel(e, info),          // released early ("almost"), never a fail
})
<button type="button" className="eosPilotHit …" {...bind} {...markerIfLive} />
```

- **Pointerdown:**
  - read the ≤ 6 target rects (near-hit) **before** any style or attribute write, so there is no forced layout;
  - `e.preventDefault()` (no text selection, no native drag image);
  - **holds only:** `setPointerCapture(e.pointerId)`. Taps never capture;
  - set `data-press` synchronously, so feedback lands in the next frame;
  - ignore secondary pointers on the same target.
- **Release:** `pointerup`, `pointercancel` and `lostpointercapture` all release. On cancel, CLEANSE also calls `eosBreathOwn(null)`.
- **No `onClick` actions** (a mouse tap would fire twice). **Keyboard:** the hit is a real `<button>`; `onKeyDown` Enter/Space with `!e.repeat` and `preventDefault()` taps. A hold is keydown to start and keyup to release, with the same threshold; Escape cancels.
- **Android long-press:** hold targets get `onContextMenu={e => e.preventDefault()}` (the menu fires at about 500 ms, before the threshold; `-webkit-touch-callout` is iOS only).
- **Hold visual (E11):** a WAAPI animation started on pointerdown moves the water node `translateY(100%) → 0` inside the ball's circular `overflow: hidden` clip over `fillMs`, and the Body breathes via `emit("inhale")`. Both run on the compositor. An early release calls `anim.updatePlaybackRate(-2)` to drain. `--hold-pct` is written from `anim.currentTime` at ≤ 20 Hz and set to exactly `"100%"` at `fillMs`. Register `@property --hold-pct { syntax: "*"; inherits: false }` (progressive: ignored before Safari 16.4).
- **Enabled and disabled (E2):**
  - While a marker is live, every playable hit is an **enabled** `<button>`, and exactly one of them carries the marker. (The arrows check markers first, G7, so enabled buttons are safe.)
  - In no-live windows (transitions, finale set-up, finale), the play plane gets the class `isLocked` (`pointer-events: none`) and every hit gets `disabled`.
  - Never toggle `disabled`, and never move the marker, on an element that holds pointer capture. Move the marker after release.
  - A tap in a no-live window is not a miss: it logs `action:"early"` and plays the game's soft tick, nothing else.
- **CSS** (`.eosPilotHit`, class-based, G7): `touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;`, plus a `::before` hit-extender so the hit area is ≥ 64 × 64 px. S6.8 resets the arcade's button styles.
- **Pointer-events:** strings, droplets, ink, goo, the CRUSH blob and every decoration inside or near a target are `pointer-events: none`, so hit tests land on the target.
- **Forgiveness:** `useEosPilotNearHit(arenaRef, getLiveTargets, radius = 28)`. A pointerdown on empty stage within 28 px of a live target's edge is routed to that target. Otherwise it is a **miss** (the game's miss reaction plus its soft `miss` cue; never silent).

**`useEosPilotBox(arenaRef)`** returns `{ w, h, u, play: { top, bottom, left, right }, phone }`:

- `phone` = arena width < 700.
- `u` = min(w/360, h/480) at phone size, min(w/1180, h/620) at desktop.
- `play` = the arena rect minus the bottom of the `.engineProgressHud` band (top) and minus the guide (bottom):
  - phone: the docked strip's top − 8 px. The strip has a fixed 44 px height (S6.4), so the box is stable;
  - desktop: the guide's maximum height, measured once per arena size or orientation (the guide overlaps the arena bottom-left).
- Never observe or measure the keyed `.guideStepCard` (it remounts, G2). Update only on the arena's ResizeObserver and `visualViewport` changes, rAF-throttled; ignore height-only `visualViewport` changes < 80 px (the mobile URL bar).
- It also writes `--eos-pilot-toast-top` on the shell (S6.2).
- **Never hard-code pixel positions.** Every layout in §3 is a fraction of `play`, with px minimums. The "y ≈" values in §3 are viewport estimates for 390 × 844.

Expected: phone play box ≈ 360 × 575 (viewport y ≈ 95 → 670) with the guide docked; desktop play box ≈ 1230 × 670, with the LIVE GUIDE occupying the bottom-left ≈ 460 × 160.

### S6 · Chrome hooks inside the pilot's scope (`70_pilot_core.jsx`)

1. **Shell attributes (E21).** In a layout effect, each engine sets on `arena.parentElement` (`.cinematicContentShell`): `data-eos-pilot="<id>"`, `data-eos-pilot-guide="dock|open|bend|off"` (phone starts at `dock`, desktop is `off`) and `--eos-pilot-toast-top`. React does not manage these, so wrapper re-renders keep them; unmount removes them. **No `:has()` anywhere** (older Android WebViews drop the whole rule).
2. **Toast dock (G6).**

   ```css
   ${EOS_A}.stage-play .cinematicContentShell[data-eos-pilot] :is(.globalStepFeedbackCopy,.globalFinishFeedbackCopy){
     --fx-x:50%!important; --fx-y:var(--eos-pilot-toast-top)!important;
     top:var(--eos-pilot-toast-top)!important; left:50%!important; translate:-50% 0!important }
   ```

   - `--eos-pilot-toast-top` = the HUD band's bottom + 8 px, in the toast's containing block (measured by S5), so the toast never covers the progress HUD.
   - Verify by rect (V3) on the phone, where the legacy step copy is width-clamped by `@media(max-width:700px)`.
   - **CLEANSE quiet variant (CR-11):** under `[data-eos-pilot="109"]` the step toast loses its glow pill, drops to 13 px and 0.8 opacity. It is kept, just quieter.
3. **Bloom avoidance (G8):** S1 actors carry `data-eos-avoid data-eos-char`, and so does each finale's climax object.
4. **Guide dock (CR-3), phone only.**
   - `[data-eos-pilot-guide="dock"] > .globalPlayGuide` becomes a 44 px strip at the guide's bottom edge. It shows the `.guideStepCard` copy on one line (ellipsis) and a small chevron; `.guideHeaderRow`, `.globalMindBend`, `.guideAmbient` and `.guideSweep` are hidden while docked. The arcade positions the guide with `!important` rules, so these rules need `EOS_A` specificity and `!important`.
   - A pointerdown on the strip sets `open` (the full card, MIND BEND included) for 4 s or until the next play input, then back to `dock`. The listener is on the shell, so the step card's remounts do not lose it.
   - At the hand-off the attribute becomes `bend`: the strip shows the MIND BEND line (`.globalMindBend`, up to 2 lines, ≤ 64 px tall) until the engine unmounts. The story's moral lands with the payoff.
   - The element and its classes (`.isActive`, `.isComplete`, `.guideHit`) are untouched, so G8 and the arrows keep working. This is a redesign, not a removal (Standard 7).
   - Desktop stays `off` (the guide is out of the thumb's way there).
5. **Markers (G7).** `eosPilotMarker(spec, live)` returns `eosTarget(spec)` when `live`, else `{}`. The keys are `g, label, ms, mvar, n`; **never `L`**. Exactly one live marker at a time. Dead items get the class `isGone` (once). CRUSH keeps `data-eos-n` at the remaining slam count with a direct attribute write per tap.
6. **Hint copy (G14).** At module top level in `70_pilot_core.jsx`:

   ```js
   try { if (typeof window !== "undefined" && eosPilotOn()) Object.assign(SHORT_HINT, EOS_PILOT_HINTS) } catch (e) {}
   ```

   - `EOS_PILOT_HINTS = {1: "Tap a bubble to pop it", 2: "Tap the blob: 4 slams each", 109: "Hold an orb, breathe in… then let go"}`.
   - File order (60 < 70) makes it run after the `EOS_HINT_FIX` merge. Nothing needs restoring: the switch is per page load. `EosPilotEngineFor` stays a pure lookup with no side effects.
7. **Word rule (G15).**

   ```css
   ${EOS_A} .eosPilotArena .eosWord.eosPilotWord:is(*,.tsExactUserText){
     font-size:var(--eos-pilot-word-px)!important; font-weight:800!important; line-height:1.12!important;
     color:var(--eos-pilot-ink)!important; opacity:1!important }
   ```

   `--eos-pilot-word-px` = clamp(15px, the game's value, 17px). **Never scale word size by `u`**: at u < 1 (a 360-wide phone) it would drop below 15. The builder confirms the class `EosWord` renders and adjusts the selector if it differs.
8. **Arcade CSS resets (G17).**

   ```css
   ${EOS_A} .eosPilotArena .eosPilotHit:is(*,:hover,:focus,:active){background:none!important;border:0!important;
     box-shadow:none!important;padding:0!important;min-width:0!important;min-height:0!important;font:inherit!important}
   ```

   Plus a pilot `:focus-visible` ring (a light circular outline that follows the object, never a plate). Live elements never carry an `EOS_ARROWS_DEAD` word or `ToolDock`, `ToolButton`, `ActivateBtn` in their class names. 10_eos_readability's `!important` rules on `.combo`, `.literalProgress`, `.uniqControl` and `.cleanseBubbleHoldButton` never hit pilot nodes, because the pilot uses none of those names.
9. **Afterglow on the reveal (CR-2b).** Approved by the lead for the pilot, behind the pilot switch; the owner signs it off in the approval package, and W0-2 is told so it can adopt or replace it.
   - At the hand-off, S2 sets `data-eos-pilot-afterglow="sky|pool|workshop"` and `--eos-pilot-afterglow-face: url(<hero win face>)` on the `.tsArcade` root.
   - CSS applies only under `${EOS_A}.stage-reveal[data-eos-pilot-afterglow="…"]`:
     - `.releaseCompleteOverlay` gets the kit's calm gradient in place of the 0.76 black: POP clear sky, CLEANSE clearest night with a few stars, CRUSH a warm workshop glow;
     - `.releaseCompleteCard::before` draws the hero's win face as a 96 px circle (72 px if the card's top is < 120 px from the top of the viewport at 390): `border-radius: 50%`, `background: var(--eos-pilot-afterglow-face) center / cover`, no plate, in the card's flow above its first line, so all text sits below it.
   - **Clearing:** a module-level MutationObserver on the root's `class`, started at the hand-off, removes the attribute and the var once the root leaves `stage-reveal` (or leaves `stage-play` for anything else), then disconnects. An engine that unmounts before its hand-off clears them at once, and every pilot mount clears stale values.
   - It never changes the overlay's DOM, buttons or text.
10. **Reveal leftovers (CR-19):** the CRUSH phone reveal overflow, the missing desktop card and the clipped header belong to the root overlay and shared chrome (W0-2). The pilot does not touch them; §1.5 lists them.

---

## 3. The three games

All timings are in ms. "T0" is the final input's `timeStamp` (CRUSH: the big-slam tap). "s" is the sound-cue row in each game's cue table.

### 3.0 Words (all three games, CR-7)

`eosPilotWords(entries, max = 6)` (via `eosWords` / `isImageOnlyEntries`) returns `{waves: string[][], imageOnly}` and then **merges stop-only chunks**:

- A chunk made only of stop tokens (`i, me, my, and, at, to, feel, am, is, so`, case-insensitive) merges into the next chunk, or into the previous one if it is the last.
- The merged label keeps every token. For example, "my boss / yelled at me / I feel / panic" becomes "my boss / yelled at me / I feel panic"; "me and" never stands alone.
- So no object is only "I", "feel" or "me and", and every token still appears on some object (Standard 7).
- N can therefore be 1-6 per wave. Every layout below is given for N = 1…6.
- POP's N for progress is the **total** word count across waves. CRUSH asserts N ≤ 6 (G4).

### 3.1 POP (id 1): "Balloon Morning" (Destroy · holder role · `sky` kit)

**One line.** The anxious character stands on a small sunlit cloud-top, yanked every way by a jittery bunch of iridescent soap bubbles. Each bubble is one of your words, pulling in its own direction, like a child at a fair tugged by balloons in the wind. Every pop snaps a pull: the character lurches, plants its feet a little wider and steadies. At the end the droplets merge into one calm bubble around it, a space of its own, and sunlight refracts through it in a rainbow.

**Cast.** The hero is the session emotion's character (anxiety → GLITCH, panic → SYNC, overthinking → LOOPIE; none → STILL), in the S1 `holder` role with hands and feet, `reacts = [brace, wow, phew, giggle]`.

| Size | Hero | Name label | Bubbles |
|---|---|---|---|
| 390 | 112 px | 13 px, start and tableau only | 84-100 px by word length (outer slots ≤ 92) |
| 1280 | 150 px | 13 px, start and tableau only | 108-128 px |

**Storyboard**

| Time | What happens |
|---|---|
| 0-300 | Sky fades in (L0 loud); clouds drift; the cloud-top settles under the hero's feet. |
| 150-570 | The bubbles inflate, staggered 70 ms: scale 0 → 1.06 → 1, 380 ms. Tethers draw as each lands, and each bubble starts swaying in its own direction. |
| 300 | The hero bobs in on the cloud: feet together, both hands raised holding the tethers (`pose("raise")`), jitter quirk on, loud face, name label visible. |
| 700 | The arrows module shows "POP IT!" on the lowest-centre bubble, which sways hardest (the marked bubble pulls hardest, so the arrow and the story agree). The name label fades out. |
| Play | Each pop runs the beat below. After 400 ms with no pop, the bunch re-balances: upper bubbles drift down into empty lower slots (600 ms spring), so a fast chain never chases a moving target. The marker goes to the lower-row bubble nearest the last tap. |
| 3rd pop (50%) | Face → soft. Haze lifts one step and the sun disc shows through the clouds. |
| 5th pop (83%) | Face → calm. Sun rays and birds appear. The sway is almost still and the stance is wide. |
| one bubble left | **Anticipation gag:** the hero looks at the player for 400 ms (`look("camera")` + `react("wow")`), as if to say "you do it". |
| last pop | Finale (below). With more than 6 chunks, a new bunch drifts in from the right after a wave's last pop (600 ms, a no-live window) and the hero catches it with raised hands. |

**Per-pop beat**

| t | Bubble | Hero (S1) | Others / world | Sound (s) |
|---:|---|---|---|---|
| 0 (pointerdown) | dimple squash 0.94 × 1.06 toward the touch point; the tether snaps and recoils toward the hero (200) | `lurch` away from the popped side (s 0.4-0.8 by bubble size) | — | s1 `pop` (arcade pop + chain tone at 0.03) |
| 40 | film tears: scale 1.18 + opacity 0 over 140; 10 droplets fly on 2-keyframe gravity arcs (380-520); ring shockwave scale 0.6 → 1.6 (220); 4 word-glyph shards drift up (600); 1 droplet stays hanging in the air (finale material) | the acting-pool reaction (below) | the neighbouring bubbles swing ±6° on their tethers (spring, 600) | — |
| 300-420 | — | the feet re-plant wider: `setStance(k/N)` | `setTug(remaining / N)` reduces the sway | — |
| 420-920 | — | a small exhale (sigh puff) | — | s3 `exhale` (timed) |
| 920 | ready (pops never lock; a fast second pop simply overlaps) | face cross-fade if a step threshold was crossed | sky step if crossed | s4 `step` (timed, only on a crossing) |

**Acting pool for a pop** (`eosPilotPick`, never the same pair twice in a row):

- (a) `brace` face, then a look at the empty spot where the bubble was (400);
- (b) `wow` face and a shake-off (body ± 4° × 2, 260);
- (c) chain 3-4: `giggle` (300) with a shoulder bounce; chain ≥ 5: a laugh (`giggle` 450) and a one-foot hop (CR-17), with s5/s6;
- (d) on a face-step crossing: a closed-eye `phew` (450), then the new step face.

Chain variants take priority; (d) wins on a crossing. Every variant rides on the same `lurch`, whose direction follows the popped side.

- **Chain:** a pop within 900 ms of the previous one increments the chain. The pitch climbs a pentatonic ladder (`eosNote(chain, 523)`). At chain ≥ 3 a sparkle runs along the remaining tethers. Slow pops are never punished.
- **Miss:** a tap more than 28 px from any bubble, outside a no-live window. The hero does `miss` (`shake`, no sad face), the nearest lower-row bubble wobbles toward the hero (300 ms) to show where to tap, and s2 `miss` plays.
- **Finale tap** (T0 … T0 + 800): a glint runs across the calm bubble (s10).

**Progress → transformation map**

| Progress | Report | Hero face | Hero body | World |
|---|---|---|---|---|
| 0 | `onProgress(0,"0% POPPED")` on mount | loud | jitter quirk 100%, sway 6° at 1.6 s, feet together | hazy lilac, fast clouds, sun hidden (L1 sun opacity 0.25) |
| pop k < N | `round(k/N·100)` | by step | sway 6°·(N−k)/N, period → 3.2 s; stance k/N | `calm = k/N` (calm layer 0.7·calm) |
| 34-66 | | soft | jitter 50% | haze lifts, sun disc visible, clouds slow × 0.6 |
| 67-95 | | calm | jitter 0, small happy bob | rays, 2 birds |
| pop N | `EOS_PILOT_FINAL_PCT` (96), counter "POPPED N / N" | calm | wide stance | finale starts |
| hand-off | 100 (after `onDone`) | win (closed-eye smile) | — | — |

**Finale "Calm Bubble" (`useEosPilotFinale`, handoff 1300).** No lift-off and no burst: the calm bubble is the symbol the player earned, and it stays.

| T0 + | Shot | Sound |
|---:|---|---|
| 0-350 | **Climax.** The last bubble tears in slow motion (longer WAAPI durations). Its droplets, plus the hanging droplet from each earlier pop (≤ 16 nodes), freeze in the air. The light flares behind the hero. | s7 `finale.shimmer`, 660 → 1320 glide 350 |
| 350-1250 | **Transformation.** The hero raises both hands. The droplets stream along curved paths (staggered 30) into its hands and merge into one iridescent calm bubble that grows around the hero and its cloud-top (0 → 176 px at 390, 240 at desktop; the diameter is capped so it stays inside the play box). The old tethers fall away (opacity, translateY 20). Face calm → `phew` (eyes closed). At 1100 the hero presses one hand to the film from inside (`pose("press")`). | s8 `finale.merge`: plinks 1046 / 1318 / 1568 at 350 / 470 / 590 (timed) |
| **1300 Peak** | **Hand-off:** `onDone(260 + chainMax·18)`, then `onProgress(100,"100% POPPED")`. **The bubble catches the sun:** a rainbow caustic band sweeps across the cloud and the hero (translateX, 500 ms), the film's rim spins up and its colours swirl, and the face turns win (closed-eye smile). The wrapper's win × 3 lands on it; the mood bloom crowns around the bubble (avoid-tagged); the Still Point gathers. | wrapper win × 3 |
| 1300-2600 | **Afterglow, POP's own celebration.** The hero sits down cross-legged inside its bubble (`pose("sitCross")`: body scaleY 0.9, feet tucked, hands in the lap) and bobs gently with the bubble on the cloud. Rainbow glints drift over the cloud. The grade completes as a supporting move (calm layer 0.7 → 1.0). The guide strip shows MIND BEND. | s9 `finale.glow`: airy pad 523 / 659 / 784, 1200, gain 0.015, from T0 + 1700 (after the win stings) |
| 2600-4300 | **Tableau.** The hero resting in its own bubble on the sunlit cloud, rainbow glints, name label back (13 px). The engine unmounts at ≈ 4300; the reveal carries the sky afterglow (S6.9). | — |

**Environment.** Kit `sky`, as in the S3 table.

- **Cloud-top:** a small soft white cloud (gradients, no blur) with a sunlit top edge, under the hero's feet, part of the play plane.
- **Bubble material:** a near-transparent film (`rgba(255,255,255,.06)`) with a thin-film iridescent rim. The rim is a static conic gradient (cyan `#9EF0FF`, pink `#FFB8E6`, gold `#FFF2A8`) on its own node, rotated slowly (8 s) for the shifting colour. Bubbles are faceless.
- **Light on the bubbles:** a specular dot upper-left (from the key light), a cool rim on the right, and a small caustic glint.
- **Tethers:** a 1.5 px light thread from each bubble's base to `actor.anchor("hands")`. The tether is a child of the bubble's sway node (angle and length computed on mount and resize), so it moves with the bubble's transform. Tether lengths vary with the slot (no six identical spheres).
- **Words:** 15-17 px, weight 800, ink `#1E2A4A` with a 1 px white halo, at most 2 lines. They must stay legible on the pale sky; verify on a sheet.

**Sound cue table**

| s | Cue | Trigger | Layers | Sync |
|---|---|---|---|---|
| s1 | `pop` | bubble pointerdown | arcade `pop` (wrapper pop, step reward, haptic) + tone `eosNote(chain, 523)`, 120, sine, gain 0.035, at 0.03 | dt − at ≤ 15 |
| s2 | `miss` | empty-sky tap | tone 220 → 180, 90, triangle, 0.03; haptic 8 | ≤ 15 |
| s3 | `exhale` | pop + 420 | tone 520 → 390, 380, sine, 0.02 | timed |
| s4 | `step` | face-step crossing | tone 660, then 880 at +80, 140, sine, 0.025 | timed |
| s5 | `giggle` | chain 3-4, same event | 2 chirps 988 / 1175, 40 ms each, sine 0.02; the second at +60 (timed) | first layer ≤ 15 |
| s6 | `laugh` | chain ≥ 5, same event | 4 chirps 988 / 1175 / 988 / 1319 at 0 / 60 / 120 / 180, sine 0.02 | first layer ≤ 15 |
| s7-s9 | finale | see the shot list | tone | s7 ≤ 15 from T0; the rest timed |
| s10 | `finale-tap` | tap before T0 + 800 | tone 1568, 60, sine, 0.012 | ≤ 15 |

**Layout, phone 390** (fractions of the S5 play box, ≈ y 95-670).

- **Hero:** centre (50%, 84%) (y ≈ 578), standing on the cloud-top (cloud ≈ 89-96%). Its name label sits on the cloud below the ball (start and tableau only).
- **Bubble slots:** lower row at y 61% (y ≈ 446), x 20 / 50 / 80%; upper row at y 43% (y ≈ 342), x 20 / 50 / 80%; ± 2% seeded jitter in y. Fill order, bottom first:

  | N | Slots |
  |---|---|
  | 1 | lower 50 |
  | 2 | lower 35, 65 |
  | 3 | lower row |
  | 4 | lower row + upper 50 |
  | 5 | lower row + upper 35, 65 |
  | 6 | both rows |

- The re-balance keeps the lower row full while bubbles remain, so the marked bubble is always at y ≈ 446 (F8).
- The sway envelope (±6° about each tether base) stays ≥ 12 px inside the box, so nothing clips; the V2 rect check includes this extent. The lower row's bottom (≈ 496) clears the hero's top (≈ 522).
- **Finale:** the calm bubble (≤ 176 px) is centred on the hero and stays inside the box (≈ 490-666).
- The `POPPED k / N` pill sits at top-left inside the HUD band, 13 px. Its rect is checked against `.engineProgressHud`; if they overlap, it drops below the HUD.

**Layout, desktop 1280.**

- Hero at (60%, 80%), 150 px, on its cloud.
- Bubble rows at y 40% and 58%, three per row between x 42% and 78%, 108-128 px, with the same fill order.
- Everything stays right of the LIVE GUIDE's rect.
- The sky panorama is wider: sun at (18%, 14%), clouds spread out. The calm bubble is 240 px.

**Reduced motion.**

- No bob, sway, lurch or squash. Stance and tug show as static positions.
- A pop is a 120 ms opacity fade plus a static droplet sparkle (opacity). Reaction faces still show.
- The face and the sky still step.
- **Finale:** the calm bubble fades in around the hero (400); at the peak (800) the rainbow band cross-fades on, the face turns win and the hand-off runs.

**Performance budget.**

| Phase | Running animations | Count |
|---|---|---|
| Idle | bubbles 6 + rims 6 + hero 3 + clouds 3 + sun 1 + motes 6 | 25 |
| One pop | droplets 10 + shockwave 1 + shards 4 + neighbour swings ≤ 2 | +17 transiently, capped |
| Finale | droplets 16 + calm bubble 2 + caustic 1 + hero 3 + clouds 3 + motes 6 | ≤ 38 (bubbles gone) |

- Each pop costs one React commit (the counter and progress); all else is WAAPI and attribute writes.
- DOM ≈ 140 elements. No blur: the film is drawn with gradients.

**What makes it distinct.** It is set against C1 (the bubble row on the ring stage: 3, 4, 6, 9, 16, 19, 21, 41, 43, 99) and 74 BUBBLE WRAP.

- **Gesture:** a single direct tap on tethered soap film, with no tool arming (unlike C1's "arm, then tap ×3").
- **Physics and story:** the bunch pulls a grounded hero every way; each pop snaps a pull, the hero lurches and plants its feet wider. Fewer bubbles mean a steadier, softer, more grounded character.
- **Rhythm:** a pentatonic chain ladder, with giggles at chain 3 and a laugh at chain 5.
- **World and finale:** a daytime sky; the droplets merge into a calm bubble that stays, lit by sunlight refracting through it. No lift-off, no burst, no sunrise.
- Against **41 UNHOOK** (strings and bubbles at a night pier): UNHOOK snips strings to free bubbles that rise into sunrise. POP pops the pulls to ground the holder, in daylight.
- Against **19 ERASE** (same bubbles today): rubbing on a chalkboard.
- Against **109 CLEANSE** (the shared "spheres with words around a character" silhouette): POP's bubbles are faceless, thin, tethered and swaying around one standing hero; CLEANSE's orbs are characters sitting on water.

### 3.2 CLEANSE (id 109): "Moon Pool" (Release · breath role · `pool` kit)

**One line.** Six characters sit in clouded glass orbs on a still night pool, seen from a high bank looking down onto the water. Press and hold one: it breathes in with you, and clear water rises inside it. Let go: it breathes out the murk, which sinks and dissolves. The orb turns crystal clear and settles calm on a lily pad, and one lotus petal loosens and glows. The session's own character waits front-centre for last. When it clears, it glides on its pad to the lotus, the lotus opens for it, STILL wakes inside, and the two touch foreheads under the clearest night, the stars doubled in a mirror-still pool.

**This is deliberately not a sky-lantern game.** 114 SKY LANTERNS (hold a lantern, lift it to a sky constellation) and 111 BIG SIGH (one breath orb, storm clouds blown to sea, dawn sky) already exist. QUALITY_REPORT P3's "floats up as a lantern" is therefore replaced by **water-borne cleansing**. Everything sits on the water, and the finale is a **reflection under a clear night**, not a sky or a dawn.

**Cast.**

- **The protagonist:** the session character (panic → SYNC; with no session emotion, the first character in `EOS_AROUSAL_ORDER` other than STILL), front-centre, 96 px at 390 and 108 at 1280, always cleared last.
- **The other orb characters,** one per word, in the S1 `breath` role: front sides 88 px (100 at 1280), back row 68 px (80 at 1280) and slightly dimmer for depth. The character is `eosDetectEmotion(word)`'s char, else a cycle that visits the other characters in `EOS_AROUSAL_ORDER` order, with no repeats until all are used. Each orb `reacts = [phew]`.
- **STILL,** the 7th, sleeps inside the closed lotus bud: S1, 72 px, calm face, visible faintly through the petals (0.35 opacity).

**Fixes carried in by design:**

- reveal hand-off (S2, G10);
- faces decoded before display (S1) and never empty;
- no percentage on the lotus (the petals are the in-world meter);
- the hold control is the orb itself (the action caption is bound under it);
- the 3.2 s lock is removed.

**Storyboard**

| Time | What happens |
|---|---|
| 0-400 | Night pool fades in: violet haze, the moon blurred through mist, reflections broken by slow ripples. |
| 200-800 | The orbs rise out of the water, staggered 80: translateY 24 → 0 and opacity, 360. Murk swirls inside each (a rotating ink layer); a ripple ring sits at each base. The protagonist's name shows below it. |
| 700 | The marker goes on the first suggested orb (front-left): "BREATHE IN… LET GO". Its caption is at full strength; the others are at 0.5 opacity. The name label fades. |
| Play | Hold and release in any order. One active hold at a time; a second pointer is ignored. **No lock between orbs:** while one exhales, the others can be held. Suggested order: front sides → back row → the protagonist last. |
| each clear | One more lotus petal loosens and glows: `round(6k/N)` of the 8 petals. The pool's murk steps down. |
| 34% | The remaining orbs' faces soften (global step 1). The murk halves; the moon's reflection sharpens. |
| 67% | Calm step. Stars sharpen; the mist thins. |
| the protagonist's exhale | Finale (below). With more than 6 chunks, wave 2 rises from the pool after wave 1; the protagonist appears only in the last wave. |

**Per-orb beat (hold → release)**

| t | Orb | Character (S1 breath) | Others / world | Sound (s) |
|---:|---|---|---|---|
| 0 (pointerdown on the orb block) | the rim brightens; `data-press`; pointer capture; a ripple ring starts under the orb (one per 600 ms while held, pool of 3) | `press`, `look` up, eyes widen; its caption becomes "breathe in…" at full strength | **sympathetic breathing (CR-5):** the uncleared orbs `inhale` at amp 0.3 over 3000; cleared orbs lean toward the held orb; STILL's bud glows faintly | s1 `hold` (arcade `soft`: explicit, so no toast; plus the rise tone) |
| 0-3000 | clear water rises inside: the fill node `translateY(100% → 0)` over 3000 inside the ball's circle (WAAPI); the murk node's opacity goes 1 → 0.55; `--hold-pct` 0 → 100% on the button at ≤ 20 Hz | `inhale` over 3000: stretches up 8% | `eosBreathOwn("in", 3000)` (the Still Point inhales with you) | — |
| 850 (held) | threshold: a release now counts as a clear. The rim starts to warm faintly; no sound | — | — | — |
| 3000 (held) | full breath: the rim turns gold; the fill caps; the caption reads "let go…"; holding longer is fine | holds the inhale | haptic `EOS_HAPTIC.notch` | s2 `ready` (timed from the hold start, cancelled on release) |
| release ≥ 850 | **exhale ≥ 2400:** squash 1.1 × 0.9 (160) → settle (340 spring); the murk leaves downward as 3 ink puffs that sink and dissolve in the pool (translate + scale + opacity, 2400); the glass clears (cloud node opacity → 0); the orb dips onto a lily pad that scales in under it (300) and turns gently toward the lotus. **Deep clear** (released after 3000): 5 ink puffs, the pad blooms a small flower, a richer chime. The marker moves to the next suggested orb. | `exhale` (2400); `react("phew", 450)`, then calm (this orb only) | the sympathetic orbs `exhale` at amp 0.3; `eosBreathOwn("out", 2400)`, then `eosBreathOwn(null)`; pool murk steps down (`calm = k/N`); one more petal glows; `p.sfx("pop")` gives the step reward, then `onProgress(k/N·100)` | s3 `exhale` (arcade `pop` + the out tone) |
| +600 | the cleared orb chimes its melody note | — | — | s4 `clear` (timed) |
| release < 850 ("almost") | the water drains back (fill animation at playback rate −2); the caption flashes "a little longer…" for 900 ms | small sigh (`exhale` 300, amp 0.5) | the sympathetic inhales reverse; `eosBreathOwn(null)` | s5 `almost` |

**Breath pacing (CR-11).** A full cycle is a ~3 s inhale plus a ≥ 2.4 s exhale, about 11 breaths a minute. The 850 ms threshold stays as the accessible pass mark (no fail), and the arrows' meter teaches the full breath.

**Captions (CR-11).** Every orb keeps its emotion-aware caption `hold to <action>` (Standard 7). It shows at full strength only on the marked or held orb; on the others it is at 0.5 opacity, 13 px. The held orb's caption is the coaching line in the moment: "breathe in…", then "let go…" at 3000. After a clear, the orb keeps its word and the caption fades to 0.3.

**Melody (CR-16).** `EOS_PILOT_CLEANSE.melody = [392, 440, 494, 587, 659, 784]`: G major pentatonic rising to the tonic, G5. A wave of n orbs plays the last n notes, so its final clear always lands on the tonic. Wave 2 restarts the phrase.

**Progress → transformation map**

| Progress | Report | Uncleared orbs | Cleared orbs | Pool, sky and lotus |
|---|---|---|---|---|
| 0 | `onProgress(0,"0% CLEANSED")` | loud face, murk 100% | — | murky violet water, thick mist, blurred moon, broken reflections; lotus closed, STILL faint |
| k < N | `round(k/N·100)`, label `n% CLEANSED`; counter `k / N CLEAR` | face step by global progress (loud → soft → calm) | calm, clear glass, on a lily pad, turned toward the lotus | murk opacity 1 − k/N; ripple amplitude falls; moon reflection opacity k/N; `round(6k/N)` petals glowing |
| 67-95 | | calm | calm | stars sharpen; the mist thins |
| N | 96 | — | calm | finale |
| hand-off | 100 (after `onDone`) | — | calm (protagonist and STILL: win) | the clearest night |

**Finale "Clearest Night" (handoff 1300)**

| T0 + | Shot | Sound |
|---:|---|---|
| 0-700 | **Climax.** The protagonist's last ink dissolves. One ripple ring sweeps the whole pool (scale 0.2 → 3, opacity 1 → 0, 700). Behind it the water turns mirror-still: the ripple texture fades and the reflection plate (a flipped copy of the calm sky and moon, bounded to the water) fades in. The 6 stars appear doubled in the mirror. | s6 `finale.ripple`: 196 + 294, 900, gain 0.04 |
| 200-1000 | The protagonist glides on its pad to the lotus's front edge (800, ease-in-out). A silver moon path lays itself across the water from the moon's reflection to the lotus (scaleY 0 → 1, 700). The cleared orbs turn on their pads to watch (`look` at the lotus). | — |
| 500-1300 | **Transformation.** The remaining petals open (8 in all, staggered 60, 700 each, completing at 1300); the lotus's gold core brightens. | s7 `finale.lotus`: arpeggio 392 / 494 / 587 / 740 / 880 at 850 / 950 / 1050 / 1150 / 1250 (timed, finishing before the win stings) |
| **1300 Peak** | **Hand-off:** `onDone(340 + N·25)`, then `onProgress(100,"100% CLEANSED")`. The lotus is fully open and its gold light becomes the warm key (the key-light vars move to the lotus; the gold reflects in the mirror). STILL wakes (eyes open, win face, rises 18 px), and the protagonist and STILL **touch foreheads** (both lean 8° in, win faces). Win × 3 lands on the touch; the flip bloom avoids the lotus and both characters. | wrapper |
| 1300-2600 | **Afterglow, CLEANSE's own celebration.** The two sway together once, slowly (2 s). The gold light spreads across the mirror as a soft path. The cleared orbs glint once each (staggered 120) and glow faintly. 6 fireflies lift off the reeds. The grade completes as a supporting move (calm layer 0.7 → 1.0, deep clear indigo, never dawn). The guide strip shows MIND BEND. | s8 `finale.night`: low pad 196 / 294 / 392, 1400, gain 0.012, from T0 + 1700 |
| 2600-4300 | **Tableau.** A mirror pool under a clear starry night, the stars doubled, the open lotus glowing gold with STILL and the protagonist forehead to forehead, the cleared orbs watching from their pads. The protagonist's name returns. The engine unmounts at ≈ 4300; the reveal carries the pool afterglow. | — |

**Finale tap** (T0 … T0 + 800): one ripple ring from the tap point (s9).

**Environment.** Kit `pool`, as in the S3 table.

- **Point of view:** a high horizon at 24% of the box, looking down onto the pool; the water fills the whole box below it, with a reflection plate and a ripple texture (two static gradient rings, scaled). The moon and its reflection sit above and just below the horizon.
- **Glass orbs:**
  - a light glass rim (white at 22%) with a cool rim light from the left;
  - a specular highlight from the moon, upper-right;
  - an inner murk layer: a dark-violet radial-gradient ink (`#3A2C5E` at 70%) that only ever sits **inside** the circular ball and is never a box behind it;
  - a clear-water fill (`#9FE3FF` → `#E9FBFF`, 35%);
  - a ripple ring at the base, on the water.
- **Lily pads:** green `#2F6B4F` → `#5FAF7A` ellipses, appearing under cleared orbs; a deep clear adds one small flower.
- **The lotus:** 8 petal nodes, a gold core and STILL; a bud at 60% of full size until petals open.

**Sound cue table**

| s | Cue | Trigger | Layers | Sync |
|---|---|---|---|---|
| s1 | `hold` | orb pointerdown | arcade `soft` + tone 330 → 392, 400, sine, 0.02 | dt − at ≤ 15 |
| s2 | `ready` | hold start + 3000 (timed, cancelled on release) | tone 784, 220, sine, 0.03; haptic notch | timed |
| s3 | `exhale` | release ≥ threshold | arcade `pop` (step reward and chain) + tone 587 → 392, 1200, sine, 0.02; haptic `EOS_HAPTIC.exhale` | ≤ 15 |
| s4 | `clear` | release + 600 | tone `melody[i]`, 260, sine, 0.03; a deep clear adds the fifth above at +720 | timed |
| s5 | `almost` | early release | tone 392 → 330, 120, triangle, 0.02 | ≤ 15 |
| s6-s8 | finale | shot list | tone | s6 ≤ 15 from T0 |
| s9 | `finale-tap` | tap before T0 + 800 | tone 523, 80, sine, 0.01 | ≤ 15 |

**Layout, phone 390** (fractions of the S5 play box, ≈ y 95-670).

| Element | Position |
|---|---|
| Horizon | y 24% (y ≈ 233) |
| Moon | (80%, 9%); its reflection just below the horizon |
| Back row | 3 orbs, 68 px, at y 35% (y ≈ 296), x 18 / 50 / 82% |
| Lotus | (50%, 60%) (y ≈ 440), 96 px open |
| Front row | y 79% (y ≈ 549): sides 88 px at x 18 / 82%; the protagonist 96 px at x 50% |

- **Each orb block:** the ball, a ≥ 6 px gap, the word (15 px, ≤ 2 lines, ≤ 108 px wide), then the caption (13 px). The whole block is one `eosPilotHit` target (≈ 108 × 124 in the back row, ≈ 108 × 150 in front), so the pill-to-sphere ambiguity is gone.
- **Rect checks (2-line words included):** the back-centre block ends (≈ 386) above the lotus's top (≈ 392); the lotus's bottom (≈ 488) is above the protagonist's top (≈ 501); the front blocks end ≥ 12 px above the play-box bottom.
- **Fill order per N:**

  | N | Orbs |
  |---|---|
  | 1 | the protagonist |
  | 2 | + back centre |
  | 3 | the front row |
  | 4 | front row + back centre |
  | 5 | front row + back sides |
  | 6 | all |

- F8: the front row is at y ≈ 549; the back row (y ≈ 296) sits in the stretch zone, which the CLEANSE rule allows for slow holds.
- The `k / N CLEAR` pill sits top-left in the HUD band.

**Layout, desktop 1280.**

- Horizon at 24%; the moon at (84%, 9%).
- Columns at x 46 / 64 / 82% (clear of the LIVE GUIDE at bottom-left); the lotus at (64%, 60%), 132 px.
- Back row at y 33%, 80 px; front row at y 80%, 100 px (the protagonist 108); words 16 px.
- The protagonist's glide runs up the centre column to the lotus's front edge.

**Reduced motion.**

- No stretch, squash, glide, sway or sympathetic breathing.
- The hold fill still shows, because it carries information: the clear-water layer's opacity follows the fill (WAAPI opacity over 3000) instead of the translate.
- The exhale is a 400 ms cross-fade, murk → clear. No ink travel.
- **Finale:** the pool cross-fades to mirror (500); the protagonist cross-fades to the lotus's edge; the lotus's closed and open states cross-fade (500); at 800 the gold key and both win faces cross-fade on and the hand-off runs.

**Performance budget.**

| Phase | Running animations | Count |
|---|---|---|
| Idle | orb bob 6 + murk swirl ≤ 6 (cleared orbs stop theirs) + mist 2 + moon 1 + stars 3 + water shimmer 2 | 20 |
| Hold | fill 1 + body 1 + sympathetic ≤ 5 + ripple 1 | +8 |
| Exhale (may overlap a hold) | ink 3-5 + pad 1 + body 1 + sympathetic ≤ 5 | +12, total ≤ 40 |
| Finale | petals 8 + fireflies 6 + mirror / moon path / key 3 + glide 1 + STILL 2 + glints 6 | ≤ 34 (bob and murk stopped) |

- No React state per frame (the lesson from 18 BURN); the hold fill is WAAPI.
- Faces follow the S1 decode policy: ≈ 7 at mount, ≤ 20 at any time. DOM ≈ 190 elements at N = 6.

**What makes it distinct.**

- **Within mechanic cluster D** (hold to threshold: 11, 13, 39, 65, 99, 18) and its visual twins 65, 11 and 18:
  - the hold is on the **character itself**, paced by the shared breath (CLEANSE owns the Still Point while held), with no timing window (unlike 11 PRESSURE POP's green zone);
  - the release is an **exhale you watch** (2.4 s of murk leaving), and the other orbs breathe with you;
  - progress is shown by **the world itself** (the pool clears, the lotus petals glow);
  - the finale is a meeting at the lotus under the clearest night, in a mirror.
- **Against 114 SKY LANTERNS and 111 BIG SIGH:** everything stays on and in the water (cleansing downward, gathering on lily pads), with no sky lift, no storm clouds and no dawn. The lotus, the forehead touch and STILL's awakening are this game's own icons.
- **Against 1 POP:** characters sitting on water, not faceless film tethered to one hero.

### 3.3 CRUSH (id 2): "The Press" (Destroy · inside role · `workshop` kit)

**One line.** A hydraulic press on a night workshop line. Each thought rolls in on a conveyor as a squishy jelly blob with a furious character inside. Tap the blob: the steel jaw slams. Each slam squeezes red-hot heat out of it: goo and steam squirt from the jelly rim into the heat tray, and the blob cools from angry red toward its calm colour, its face moving from effort to relief. Four slams and it pops back round and smiling and rides up to the gallery to watch. The heat collects as embers. After the last thought, the embers fuse on the anvil for ONE BIG SLAM, the player's own, into a glowing cube. The cube cracks open into a small warm core, and the session's character catches it and holds it like a hand-warmer while everyone leans in to the glow.

**Cast.**

- One blob per round, S1 `inside` role with hands: 130 px at 390, 170 at 1280. Its character is the word's detected emotion, else the session character. **The last round's blob is always the session character, the hero** (anger → RUSH). `reacts = [brace, pfff, grin, phew, curious]`.
- The **starting face** of each incoming blob follows global progress (rounds 1-2 loud, 3-4 soft, 5-6 calm-leaning). The workshop is cooling.
- **The gallery audience (CR-5):** finished blobs sit on the gallery shelf at 44 px, circular, with their calm face. They act by motion only: a wince on every slam, a cheer hop on a heavy hit, a bump when a newcomer lands, and a lean toward the glow in the finale.
- **The next blob** peeks in at the conveyor's left edge (decoration, `pointer-events: none`).

**Rounds.** Rounds = N (≤ 6, asserted; any tail is joined on the last tag, ≤ 2 lines). Each round takes 4 slams, then the finale takes one big slam: 4N + 1 taps.

**Storyboard**

| Time | What happens |
|---|---|
| 0-400 | Workshop lights up: lamp flicker, 2 frames of opacity. The red beacon spins. |
| 200-700 | Blob 1 rolls in on the conveyor from the left: translateX −120% → 0, with a squash on stop. Its tag drops onto the anvil face (spring), showing 4 empty pips. Blob 2 peeks in at the left edge. Blob 1's name shows briefly. |
| 700 | Marker on the press mouth: "CRUSH ×4". The gauge plate shows `CRUSH 0/4`. |
| Play | Slams as below. After the 4th: splat → pop-back (+350). The next blob starts rolling in at +350, while the finished one rolls right and rides the wall lift up to the gallery. The marker is back at ≈ +700. |
| Round 3 | Beacon dims to 50%. The lamp warms. |
| Round 5 | Beacon off. Warm lamp. |
| Round N, 4th slam | Finale set-up, then the big slam. |

**Per-slam beat (every tap on a live blob counts)**

| t | Jaw / press | Blob (S1 inside) | World | Sound (s) |
|---:|---|---|---|---|
| 0 (pointerdown on the press mouth) | **Count `n++` synchronously:** the plate (`data-n`), the tag pip and `data-eos-n` update in the handler. Anticipation: the jaw twitches up 4 px; the piston hisses. If the jaw is mid-cycle, cancel its animation and restart from the current computed transform with `cycle = clamp(0.8 × interTapMs, 90, 268)` | `press`: braces, hands up against the jaw | — | s1 `slam` (press layers at 0, impact layers at 0.03) |
| 0-30 | the jaw drops (ease-in) | — | — | — |
| 30 (impact) | the jaw hits the blob's top | `squeeze` to c = 0.22 / 0.42 / 0.6 for slams 1-3 (wobble variant from `eosPilotPick`); `setHeat(n/4)`; face: slam 1 `brace` (gritted effort), slam 2 `pfff` (puffed cheeks), slam 3 `brace` with a deeper squash | red-hot goo and steam squirt from the jelly rim into the heat tray (4 drops, 8 when heavy); the play plane shakes ±3 px (±6 heavy), 3 keyframes over 120; the gallery winces (3-frame squash, staggered 20) | — |
| 30 → cycle end | the jaw recoils (hydraulic ease-out); the gauge needle sweeps | recovers with a spring | — | — |
| **Heavy window** | a tap 180-320 ms after the previous counted tap is a HEAVY hit (a bonus, never a gate): deeper sound, bigger squirt and shake, the gauge flashes. The jaw's edge lights amber for the duration of the window | — | the gallery cheers: one hop and a sparkle | s2 `heavy` replaces s1's impact layers |
| **Window tick** | if no tap has come by +180, a soft click ticks as the jaw's edge glows (a tap cancels it) | — | — | s3 `tick` (timed) |
| 4th tap (word k done) | SPLAT: the jaw holds down 120 | `squeeze(1)` (pancake 0.22), `setHeat(1)` (now its calm hue), face `grin` (relieved), plus a 10-drop goo ring; the tag rattles | one red **ember** drops into the heat tray (k embers); `p.sfx("pop")`, then `onProgress(k/N·100)` (G4) | s4 `splat` (tone + the arcade `pop`) |
| +350 | the jaw lifts | `popBack`; `react("phew", 400)`, then calm | the next blob starts rolling in; the finished blob rolls right (300), rides the wall lift up to gallery slot k (300) and bumps its neighbour on landing | s5 `popback`, s6 `roll` (timed) |
| ≈ +700 | the marker returns on the new blob | starting face by global step | the blob after it peeks in | — |

- Taps during the ≈ 700 ms transition are not counted and are not misses: a jaw twitch and a soft hiss (s12, `action:"early"`).
- **Miss:** a tap on the wall or floor more than 28 px from the press mouth. The jaw stays still; the blob tilts toward the tap and raises a curious eyebrow (`miss` `tilt` + `react("curious", 450)`); s7 `clank` plays.
- **Acting variety:** the face follows the slam index, so consecutive slams never share a face; the wobble variant changes too, so face-plus-motion pairs never repeat (F10).

**Progress → transformation map**

| Progress | Report | Blob faces | Workshop |
|---|---|---|---|
| 0 | `onProgress(0,"0% CRUSHED")` | loud | red beacon spinning; harsh sodium lamp; night-blue windows; steam leaks |
| round k < N done | `p.sfx("pop")`, then `onProgress(round(k/N·100), "n% CRUSHED")` | the next blob starts at the global step | `calm = k/N`; the beacon's opacity is 1 − k/N; the heat tray glows brighter (k embers) |
| 34-66 | | soft start | lamp warms |
| 67-95 | | calm start | beacon off; tungsten lamp; steam stops |
| round N done | `p.sfx("pop")`, then 96, **held until the hand-off** | `phew` → calm (the hero) | finale set-up |
| hand-off | 100 (after `onDone`) | win (the hero) | the warm core |

**Finale "Warm Core"**

*Set-up (no-live window, after round N's pop-back):*

| After the 4N-th slam | What happens | Sound |
|---:|---|---|
| +350 → +950 | The hero (the last blob, the session character) hops off the anvil to its watch spot right of the press, and its name shows. The heat tray's embers roll out onto the anvil and fuse into one red-hot glowing mass (inside the press-mouth button). The gallery blobs hop down to the conveyor in a row to watch (5 hop arcs, staggered 50). The lights dim (lamp 0.6), the beacon gives one last spin, and the jaw rises extra high and quivers (an anticipation hold). | s8 `finale.charge`: 110 → 220 saw glide 600, 0.02, + 180 Hz body (timed) |
| +950 | The marker `{g:"tap", label:"ONE BIG SLAM"}` goes live on the press-mouth button. Earlier taps do not count (the plane is locked); each makes 1-2 sparks. If no tap comes within 8 s, the jaw slams by itself (logged `auto:true`), so the game can never stall. | — |

*The big slam (T0 = the player's tap; handoff 1300):*

| T0 + | Shot | Sound |
|---:|---|---|
| 0-300 | **Climax: the player's big slam.** The jaw drops from its high hold, impact at +30: 8 px shake over 160, a 12-spark burst (pool), a lamp flicker. The audience flinches, then cheers. | s9 `finale.mega` (impact, at 0.03): 55 Hz 400 ms 0.12 + body 180 Hz 200 ms 0.07 + click 3 kHz 10 ms + 900 Hz 60 ms; haptic two-pulse |
| 300-1100 | **Transformation.** The jaw lifts. A small glowing amber cube sits on the anvil. 3 crack overlays light in turn (500, 800, 1100), with light leaking through, and the cube trembles. The hero raises its cupped hands (`pose("cup")`). | s10 `finale.crackle`: 2400 Hz, 30 ms, at 500 / 800 / 1100 (timed) |
| **1300 Peak** | **Hand-off:** `onDone(250 + heavyHits·5)`, then `onProgress(100,"100% CRUSHED")`. The wrapper's win × 3 lands **as the cube bursts**: warm light rays (a static conic gradient scaling 0 → 1.6, rotating slowly) flood the shop, and the small warm core inside rises and floats down into the hero's cupped hands (1300-1900). Flip bloom (avoids the core and the blobs), Still Point gather. | wrapper |
| 1300-2600 | **Afterglow, CRUSH's own celebration.** The hero cradles the core like a hand-warmer (hands close around it, win face, eyes half-closed). The core paints a warm under-light on every blob's face (`i.under` opacity 0 → 0.6). The audience leans in toward the hero to warm themselves (lean 6°, staggered 80). 3 steam vents give relief puffs. The lamp settles warm; the windows stay night (a supporting grade, never a sunrise). The guide strip shows MIND BEND. | s11 `finale.warm`: pad 262 / 330 / 392, 1200, 0.015, plus a soft steam hiss, from T0 + 1700 |
| 2600-4300 | **Tableau.** A warm, quiet workshop, the press open and still, the hero holding the glowing core, the others leaning in, lit from below. The engine unmounts at ≈ 4300; the reveal carries the workshop afterglow. | — |

**Finale tap** (T0 … T0 + 800): 3 sparks.

**Environment.** Kit `workshop`, as in the S3 table.

- **Materials:**
  - brushed steel: hairline `repeating-linear-gradient` plus a static light band from the lamp, rivets as radial dots;
  - a chrome piston rod (vertical gradient);
  - yellow and dark hazard stripes on the anvil base only (never behind a face);
  - the conveyor: dark rubber with lighter cleats, running at anvil-top level on both sides; motion is the translateX of a repeating stripe node.
- **Blob:** a circular character image inside a translucent jelly rim. Two stacked rims (angry red `#FF4A3A` at 45%, the character's calm hue at 35%) cross-fade with `setHeat`. A white gloss upper-left, a lamp-light top highlight, small hand nubs at the sides. No dark chip.
- **Tag:** a stamped metal plate on the anvil's front face **below** the blob, `#C9CED6` with dark ink `#22262C` at 15-17 px, ≤ 2 lines, ≤ 300 px wide at 390, with 4 pips (8 px circles) that light per slam.
- **Heat tray:** a steel tray at the anvil's left with k glowing embers.
- **Gallery:** a steel gantry shelf with 6 slots of 44 px and a small wall lift on the right.

**Sound cue table** (all tone except s4's arcade layer; G4)

| s | Cue | Trigger | Layers | Sync |
|---|---|---|---|---|
| s1 | `slam` | pointerdown | press: hiss 1800 → 900 triangle 60, 0.012 + clunk 140 Hz 50, 0.04 (at 0). Impact (at 0.03): thud 70 → 48 sine 160, 0.09 + body 180 → 140 triangle 90, 0.05 + click 3 kHz 8 ms, 0.02 + clank 620 square 40, 0.02 | press: dt − at ≤ 15; impact: \|dtAudible − impactT\| ≤ 20 |
| s2 | `heavy` | same, in the window | replaces the impact layers: thud 55 sine 220, 0.12 + body 160 triangle 140, 0.06 + click 2.5 kHz 10 ms, 0.025 + ring 980 sine 300, 0.02; haptic two-pulse `[18, 40, 18]` | same |
| s3 | `tick` | previous tap + 180 (timed, cancelled by a tap) | 2.8 kHz, 6 ms, 0.008 | timed |
| s4 | `splat` | 4th tap | goo 300 → 120 sine 180, 0.05 (impact, at 0.03) **plus `p.sfx("pop")`** (step reward, one per word) | as s1 |
| s5 | `popback` | +350 | boing 220 → 660 sine 160, 0.04 + bell 880 + 1320 (at +60), 300 | timed |
| s6 | `roll` | +350 | 3 ticks 200 Hz, 20 ms, 90 apart, + 2 kHz click layer | timed |
| s7 | `clank` | miss | 400 square 40, 0.02 | ≤ 15 |
| s8-s11 | finale | shot list | as listed | s9 impact rule |
| s12 | `early` | tap in a no-live window | hiss 1800 → 1200, 40, 0.008 | ≤ 15 |

**Layout, phone 390** (fractions of the S5 play box, ≈ y 95-670).

| Element | Position |
|---|---|
| Gallery shelf (audience) | slot centres at y 14% (y ≈ 176), 6 slots of 44 px across the width (pitch 56 px), below the docked toast |
| Press crossbeam | y 20-26% |
| Piston | down to the jaw, which rests with its bottom edge at y 44% (it rises to 34% in the finale's anticipation hold) |
| `CRUSH n/4` gauge plate | on the press column, right side, y 34% |
| Blob centre | (50%, 62%) (y ≈ 452) |
| Anvil top and conveyor level | y 73% |
| Tag on the anvil face | y 75-87% (centre y ≈ 560) |
| Heat tray | the anvil's left side, y 76-84% |
| Next blob peek | the conveyor's left edge, x −8% to 10% |
| Hero watch spot (finale) | (80%, 66%), on the conveyor right of the anvil |
| `k / N` pill | top-left in the HUD band |

- **Hit target:** the press-mouth `<button>`, from the jaw's bottom (44%) to the anvil top (73%), 84% of the width (≈ 300 × 165 px), centred at y ≈ 445, in the thumb zone. The blob, and later the finale mass, render **inside** that button (`pointer-events: none`), and the marker sits on the button. At compression 0.22 the blob is ≈ 29 px tall, above the arrows' 12 px floor.
- The shake translates only the play-plane node, so the chrome never shakes.

**Layout, desktop 1280.**

- Press centred at x 56% (clear of the LIVE GUIDE), blob 170 px.
- The conveyor spans the box, with a visible queue of 2 waiting blobs on the left; the gallery audience sits on the right wall (2 × 3 slots).
- Three night windows across the back wall.

**Reduced motion.**

- No shake, jaw travel, squash or hops.
- A slam is a 100 ms flash on the plate plus a pip; the blob's compression and heat stages cross-fade (4 pre-composed states, opacity).
- Round transitions are cross-fades.
- **Finale:** the mass → cube → core cross-fade (500); at 800 the core appears in the hero's hands, the warm under-light fades on and the hand-off runs.

**Performance budget.**

| Phase | Running animations | Count |
|---|---|---|
| Play | jaw 1 + rod 1 + blob 3 + tag 1 + gauge 1 + goo pool 10 + conveyor 1 + beacon 1 + dust 6 + steam 3 + audience ≤ 6 | ≤ 34 |
| Finale | + sparks 12 + hops 5 − goo − dust | ≤ 40 |

- **Per tap:** zero React commits. The count, plate, pips and `data-eos-n` are attribute writes; the jaw, blob, shake and particles are WAAPI. Exactly 1 commit per *word* (round state). Per-word progress is also right for the guide: each `onProgress` remounts the keyed step card (G2), and per-slam progress would remount it 24 times.
- This answers the 3.7 s desktop long task (QUALITY_REPORT §7): the per-tap re-render of the whole legacy engine plus HUD is gone, and the wrapper's toast now fires once per word, not per tap.
- DOM ≈ 170 elements.

**What makes it distinct.**

- **Against C2 / mechanic cluster B** (tap a pill N times: 12, 30, 53, 54 …): the **object** is the target, and the loop has a **mechanical rhythm** (the jaw cycle plus a heavy window shown on the jaw) and per-hit **physical change** (heat squeezed out, colour cooling). Rounds come on a conveyor; the heat tray turns each word's discharge into the finale's material.
- **The story of the discharge:** the slams squeeze the heat out of the feeling, never injure it; the player lands the final blow; the ending is warmth held in the hands, not a sunrise.
- **Against 13 SQUASH** (jelly kitchen; the words are kept as a gem): industrial force discharge, and the cube **breaks open into a warm core that is held**. The words are not kept.
- **Against 5 HAMMER** (one timed swing at a forge): a 4-slam rapid sequence, hydraulic, no sweep.
- **Against 3 CRACK** (geodes) and **11 PRESSURE POP** (boiler hold-release): the workshop kit is set up as a **hydraulic factory line** (steel, conveyor, red beacon, a night gallery), never a forge or a boiler room.

---

## 4. File plan (`framer/src/pilot/`, concatenated after the release modules by `dev/pilot_build.py`)

| File | Exports (top-level names) | Contract |
|---|---|---|
| `70_pilot_core.jsx` | `EOS_PILOT_VERSION`, `EOS_PILOT_IDS = [1, 2, 109]`, `eosPilotOn()`, `EOS_PILOT_ENGINES`, `eosPilotRegister(id, Engine, meta)`, **`EosPilotEngineFor(game)`**, `EOS_PILOT_HINTS` (applied at top level, S6.6), `eosPilotWords(entries, max = 6)` (with the §3.0 merge), `EOS_PILOT_STOP_TOKENS`, `eosPilotCharFor(word, i, used)`, `eosPilotMarker(spec, live)`, `eosPilotShellAttrs(arena, attrs)`, `eosPilotAfterglow(kit, faceSrc)` / `eosPilotAfterglowClear()`, `EOS_PILOT_FINAL_PCT = 96`, `EOS_PILOT_HANDOFF_MS = 1300`, `EOS_PILOT_CORE_CSS` (arena base and the S6 hooks) | `eosPilotOn()` reads `?pilot=off\|on`, then `localStorage.eos_pilot` (`"off"`); default on; try/catch; memoised per page load, so the element type never flips mid-session. `EosPilotEngineFor(game)` returns `EOS_PILOT_ENGINES[id]` when on, else `null`. It is a **pure lookup** (no side effects) and cheap, because it runs on every router render. `eosExpose("pilot", {on, ids, state})`. **The only file that defines `EosPilotEngineFor`.** |
| `71_pilot_fx.jsx` | S0 `eosPilotImgKey`, `eosPilotAnim`, `eosPilotAnimSkip` · S1 `EosPilotActor`, `eosPilotFaceStep`, `eosPilotFaceSrc`, `EOS_PILOT_SOFT_FACE`, `EOS_PILOT_REACT_FACE`, `eosPilotPick`, `eosPilotDecode` · S2 `useEosPilotFinale` · S3 `EosPilotStage`, `EOS_PILOT_KITS`, `EosPilotParticles` · S4 `useEosPilotSound`, `EOS_PILOT_SOUND_LOG`, `eosPilotSoundRow` · S5 `useEosPilotGesture`, `useEosPilotNearHit`, `useEosPilotBox` · `EOS_PILOT_FX_CSS` | Pure systems with no game ids inside. Adds `soundLog` and `clearSoundLog` to `eosExpose("pilot")`. |
| `72_pilot_pop.jsx` | `EosPilotPopEngine`, `EosPilotPopInner`, `EOS_PILOT_POP` (layout fractions and slot table, timings, `cues`), `EOS_PILOT_POP_CSS` | `eosPilotRegister(1, EosPilotPopEngine)`. Root `<div className="arena eosPilotArena eosPilotPop">`. |
| `73_pilot_cleanse.jsx` | `EosPilotCleanseEngine`, `EosPilotCleanseInner`, `EOS_PILOT_CLEANSE` (incl. `melody`), `EOS_PILOT_CLEANSE_CSS` | `eosPilotRegister(109, EosPilotCleanseEngine)`. Root `.arena.eosPilotArena.eosPilotCleanse`. |
| `74_pilot_crush.jsx` | `EosPilotCrushEngine`, `EosPilotCrushInner`, `EOS_PILOT_CRUSH`, `EOS_PILOT_CRUSH_CSS` | `eosPilotRegister(2, EosPilotCrushEngine)`. Root `.arena.eosPilotArena.eosPilotCrush`. |

Nothing in `00_arcade.jsx` references pilot names except through the existing `typeof` guard. Pilot files never edit `src/00_arcade.jsx` or `src/eos/`.

### Engine contract (all three)

- **Props:** the wrapper's `ep` (G1), read through the S0 `live` ref. **Use:** `game, entries, imageSrc, imageSources, hasUserImages, sfx, onDone, onProgress, reduced, bubbleTextPx`.
  - Word size = `--eos-pilot-word-px` = clamp(15px, the arcade's `bubbleTextPx` mapping, 17px), never scaled by `u` (S6.7).
  - Ignore `imageSources` faces unless `hasUserImages` (the arcade's phase images follow the word).
- **User images:** with `hasUserImages`, the legacy wrapper passes the root's `visibleSlots` and the new one passes `liveImages`. Snapshot them once at mount, keyed by the joined strings. Render them in the same circular ball (`object-fit: cover` inside `border-radius: 50%; overflow: hidden`), never on a plate.
- **Mount:** `onProgress(0, "0% <VERB>")`. After that, progress is monotonic: `round(k/N·100)` per step, `EOS_PILOT_FINAL_PCT` at the last input, 100 only via S2's hand-off (after `onDone`).
- **`onDone(bonus)`:** exactly once, from S2. No `p.sfx("win")`.
- **Arrows and hits:** S5's enabled/disabled rules and S6.5's markers. Nothing in the arena matches the arrows' fallback list while no marker is live (G7). **`EOS_GESTURES` is never mutated.**
- **CLEANSE and the new wrapper's reaction faces:** the new wrapper reads `[data-ts-bubble-index]` on pointerdown (G3); the pilot has none, so slot 0 is used. Check the CLEANSE mid shot for a wrapper reaction face; if one appears, put `data-ts-bubble-index={i}` on the orbs.
- **CSS:** `eosCss("pilot-core" | "pilot-fx" | "pilot-pop" | "pilot-cleanse" | "pilot-crush", css)` at top level, every rule under `${EOS_A} .eosPilotArena` (S6 hooks excepted, as stated there).
- **Timers and visibility:** if the tab is hidden mid-finale, WAAPI pauses but the timers still fire (throttled), so the hand-off can run before the visuals. That is acceptable; the S2 watchdog covers a beat that throws.
- **Unmount (one `useEffect` cleanup per engine):**
  - the timers ref;
  - the animation Set (cancel all);
  - the rAF id;
  - `releasePointerCapture`;
  - window and document listeners (keyup for keyboard holds, `visualViewport`);
  - ResizeObserver disconnect;
  - `eosBreathOwn(null)` (CLEANSE);
  - the shell attributes (S6.1);
  - decode refs;
  - the afterglow, only if the hand-off has not happened;
  - the `live` ref is left as is.

### Wrapper differences the builders must handle

| Aspect | Legacy (POP 1, CRUSH 2) `GameEngineLegacy` | New (CLEANSE 109) `GameEngine` |
|---|---|---|
| `ep` extras | `{...p, sfx, onDone, onProgress}` | adds `imageSources = liveImages` (rotates on every step reward), `positiveImageSources`, and `hasUserImages` as a boolean |
| Step reward | toast, haptic and chain; 980 ms | toast plus `showPositiveReactionForFeedback(lastBubbleIndexRef)` → `setPositiveSlots`, `setReactionEpoch` and a recompute of `phaseImages`; 3200 ms |
| Bubble index | none | read from `[data-ts-bubble-index]` on pointerdown (L19532-19542) |
| Guide text | `globalReleaseGuideTextLegacy(game, v, label)` | `globalReleaseGuideText(game, v, label, entries)`. Both use `shortHint`, so one top-level patch covers both (S6.6) |
| Audit MutationObserver | childList, subtree, characterData | the same plus `attributes:["src"]` |
| `wrappedDone` | label → `progressLabel(100)`, win × 3, then `onDone` after 3000 ms | the same, plus shift XP and tokens (localStorage writes) and positive reactions for all slots |
| Explicit progress | POP yes; **CRUSH no** (sfx creep, G4) | CLEANSE yes (`soft` gives no toast) |

**Build order:** `70` + `71` first, smoke-tested with a stub engine for id 1. Then `72`, `73` and `74` in parallel.

---

## 5. Build, verify, risks

### Build and run

```
python3 framer/dev/pilot_build.py --dev-dir /tmp/pilot_<you>
```

Then drive `framer/dev/eos_drive.mjs`:

1. `launchEos({dir:'/tmp/pilot_<you>', width:390, height:844, lite:true})`.
2. `startGameById(page, id, "my boss yelled at me and I feel panic")` (this input exercises the §3.0 merge). Also run "panic" (N = 1), 3-, 4- and 5-chunk inputs, and a 12-word input (waves).
3. `finishGame(page, id, {log:true})`.
4. `progressLog`, `arrowState`, `smallText` (≥ 1.2 s after mount), and `page.evaluate(() => window.__eos.pilot.soundLog())`.

Repeat at 1280 × 860, with `reducedMotion:"reduce"`, with the calm toggle switched on mid-game, and with `query:"pilot=off"`. In the dev build, wrap each inner tree in `<React.Profiler id="pilot">` for the commit check.

Shots go through `dev/contact_sheet.py` (one sheet per game per size). Keep browser runs lean: another workflow shares the CPU. The paste-able Framer file is `/tmp/pilot_<you>/comp.jsx`.

### Risks and open points (decide in build, record in the progress notes)

1. **Face picks:** the soft faces and the reaction faces (`EOS_PILOT_SOFT_FACE`, `EOS_PILOT_REACT_FACE`) need one contact strip per character from the 64 expressions. Record the ids.
2. **Toast dock:** verify by rect (V3) at both sizes, including the legacy phone width clamp.
3. **Guide dock:** the arcade positions the guide with `!important` rules (for example the tiny-soundtrack rule at 00_arcade L5). Verify the dock's specificity with one 390 screenshot. If the dock fights the arcade layout, fall back to a pilot-only `max-height` clamp of the guide and report it.
4. **Reveal leftovers** (CRUSH phone overflow, the desktop card, the clipped header) belong to the root overlay and chrome (W0-2), not to the pilot. Re-shoot and list them (§1.5).
5. **Headless timings** understate real-device smoothness (CREATIVE_STANDARDS caveat). The owner's device play is the ground truth.
6. **Wave mode** (more than 6 chunks) for POP and CLEANSE needs one test with a long input (12 words).
7. **The wrapper's `CinematicStageFX` and `CharacterEmotionFX`** stay mounted behind the arena. If either draws above the arena (z-order), raise `.eosPilotArena` with scoped CSS rather than hiding anything. Measure their animation cost under the opaque arena; pausing them is the owner's call.
8. **Afterglow (S6.9)** reaches outside the arena. The owner signs it off from the approval package. If it is refused, delete the S6.9 CSS block and the two root writes, and file it for W0-2 as the top item.
9. **Face memory on low-end phones:** if a game needs more than 20 decoded faces, reaction faces go first (their motion stays).
10. **`@property` support:** WebViews without it let `--hold-pct` inherit; the cost is small (one orb block, ≤ 20 Hz).

---

## 6. Critique dispositions (v1 → v2)

### Applied as written

| Item | Where in v2 |
|---|---|
| CR-1 own light and own celebration per game; grade as a supporting move | S2 grade rule, S3 kits, §3 finales, F11 |
| CR-2(a) peak on the win × 3 at T0 + 1300; tableau composed by T0 + 2600 | S2 beats, §3 shot lists, F9 |
| CR-2(b) afterglow on the reveal | S6.9 (lead approval for the pilot; owner sign-off in §1.5; W0-2 informed) |
| CR-3 guide dock and targets moved low | S6.4, S5 box, §3 layouts (acceptance changed, below) |
| CR-4 reaction faces, acting pool, rig honesty with hand nubs | S1 (feet added for POP's stance, from CR-8) |
| CR-5 sympathetic breathing; gallery audience at 44 px | §3.2 per-orb beat, §3.3 cast (faces changed, below) |
| CR-6 no skip before T0 + 800; skip only on a deliberate tap | S2 Skip, F3 |
| CR-7 merge stop-only chunks; layouts for every N | §3.0, §3 fill-order tables, F1 |
| CR-8 grounded hero on a cloud-top, pulls, lurch and stance | §3.1 |
| CR-9 keep the calm bubble; cut the lift-off and the burst; anticipation gag | §3.1 finale and storyboard |
| CR-10 everything on the water, depth rows, the protagonist, the petal meter | §3.2 (numbers changed, below) |
| CR-11 3 s fill and ≥ 2.4 s exhale; caption strength; quiet toast | §3.2, S5, S6.2 |
| CR-12 squeeze the heat out; colour cooling; curious miss | §3.3, S1 `setHeat` |
| CR-13 the player's big slam; the warm core caught by the hero | §3.3 finale (plus a fallback, below) |
| CR-14 heavy window on the jaw; pips on the tag; peeking next blob; ≈ 0.7 s transitions; desktop queue and audience | §3.3 |
| CR-15 phone-speaker body and click layers; two-pulse heavy haptic | S4, §3.3 sound table |
| CR-16 melody resolves on the tonic | §3.2 Melody |
| CR-17 giggle at chain 3, laugh and hop at chain 5 | §3.1 acting pool, s5/s6 |
| CR-18 hero name at the start and in the tableau only | S1 `showLabel`, §1.3, §3 |
| CR-19 reveal leftovers flagged | §1.5, S6.10, risk 4 |
| E1 marker key `label` | S6.5, §1.3 |
| E2 enabled hits while a marker is live; lock only in no-live windows; capture rule | S5, F4 |
| E4 engine shell pattern | §2 S0 |
| E5 the reveal unmounts the engine; timelines end by hand-off + 2900 | G13, S2 |
| E6 `onDone` before `onProgress(100)` | G5, S2 hand-off |
| E7 count every tap; restartable jaw cycle; heavy as a bonus | §3.3 per-slam beat |
| E8 hints at module top level; pure `EosPilotEngineFor` | S6.6, §4 |
| E9 pilot word rule; no `u` scaling; V1 after 1.2 s | S6.7, V1 |
| E11 WAAPI hold fill and breath; meter ≤ 20 Hz; `@property` | S5 (meter end changed, below) |
| E12 animation helper | §2 conventions |
| E13 promote only what animates; caps; grade on/off measurement | S3, P1 (pausing the wrapper FX left to the owner, risk 7) |
| E14 decode policy and timeout | S1 decode policy, P1 |
| E16 sound-log fields, warm-up, timestamp sanity | S4 |
| E17 layer sets; split latency and impact tests; cancellable timed cues | S4, F6 (impact at 30 ms with `at: 0.03`) |
| E18 two reduced-motion sources | §2 conventions, F7 |
| E19 no `onClick`; key repeat; Android long-press; rect reads first; release paths | S5 |
| E20 the blob inside the press-mouth button | §3.3 layout |
| E21 shell attribute instead of `:has()` | S6.1 (also used by the guide dock) |
| E22 arcade hover reset; class names to avoid | S6.8, G7 |
| E23 measurable commit rule | P1 |
| E24 build constraints; `comp.jsx`; no framer-motion | G18, §2 conventions, §1.5 |
| E25 progress details (N ≤ 6 for CRUSH, POP's total N, the 96 toast in V3, per-word progress) | G4, §3.0, V3, §3.3 performance |
| E26 wrapper differences | §4 table |
| E27 timers and visibility | §4 engine contract |
| E28 unmount checklist | §4 engine contract |
| E29 user-image path | §4 engine contract |
| E30 verified-OK list | G1, G5, G7, G20 and §4 |

### Applied with a change, or rejected in part (with reasons)

- **CR-3 acceptance "every live target centre at y ≥ 400": changed.** It contradicts the critique's own layouts: POP's upper row (CR-8, y ≈ 340) and CLEANSE's back row (CR-10). Six objects, a hero and their captions do not fit between y 400 and the docked strip (≈ 670) without overlap, which Standard 4 forbids. v2's F8 instead requires the **marked** target at y ≥ 400 at all times, no POP or CRUSH live target above y 330, and the CLEANSE front row at ≥ 480 with the back row allowed in the stretch zone (≥ 280), because holds are slow and deliberate. POP's re-balance keeps the marked bubble in the lower row.
- **CR-3 "MIND BEND docked at the top for 2.5 s at the hand-off": changed.** The top band is where the finish toast is docked (E3) for those same 3 s, so two banners would stack over the peak. The MIND BEND line shows in the bottom guide strip from the hand-off until the unmount (≈ 3 s), which keeps the story's moral at the payoff.
- **CR-3 selector `:has(> .arena.eosPilotArena)`: replaced** by the shell attribute (E21), because older Android WebViews drop `:has()` rules.
- **CR-10 numbers (back row 44%, lotus 58%, front row 76%): changed.** At those values the back-centre orb's word and caption block overlaps the lotus, and the back row's top slot would sit far above the thumb. Recomputed to keep the intent (everything on the water, two depth rows, the protagonist front-centre): horizon 24%, back row 35%, lotus 60%, front row 79%, checked against 2-line words.
- **CR-5 "shelf blobs cheer with the `wow` face": rejected.** Five extra decoded faces (≈ 5 MB, E14) for 44 px figures. The audience cheers by motion (a hop and a sparkle) and keeps its calm face; the press blob and the heroes keep full reaction faces.
- **CR-9 "the flip-bloom words drift as colour swirls around the film": rejected.** The bloom belongs to the shared mood module, and the pilot cannot choreograph it. The film's own colour swirl plays, and the bloom avoids the avoid-tagged bubble (G8).
- **CR-11 versus E1/E11 on the hold meter: resolved in favour of CR-11.** E1/E11 tie the marker `ms` to 850 and put `--hold-pct` at 100% on the threshold; CR-11 maps the meter to the 3 s breath. The meter now teaches the full breath (`ms: 3000`, 100% at 3000 ms), and 850 ms stays as the silent pass mark, so nobody fails. `eos_drive` holds until the var is ≥ 97 for up to `ms·4 + 2200` ms (G20), so 3 s holds pass the driver.
- **CR-13: one addition.** If the player never makes the big slam, the jaw slams by itself after 8 s (logged `auto:true`), so the game cannot stall.
- **CR-14 heavy window "180-320 ms after the previous impact": changed** to "after the previous counted tap", because E7's restartable jaw cycle moves the impact time.
- **CR-2(b) "clear both on the next `stage === "play"`": changed.** The pilot is not mounted at that moment, and the next game may not be a pilot game. A root class observer clears the afterglow when the root leaves `stage-reveal`.
- **CR-4(c): extended.** Two foot nubs for the holder role, because CR-8's grounding (feet planting, a widening stance) needs feet.
- **E3 "dock at `top: 8%`": changed.** On the phone, 8% of the arena falls on the HUD band and would cover the progress indicator (Standard 7). The toasts dock to a measured `--eos-pilot-toast-top` (HUD bottom + 8 px).
- **E10 "never swap `src`": relaxed.** Faces outside the decode window start without a `src`; each image node gets its `src` exactly once (one mutation per face per game, never per hit) and never changes it. A new character is a new node, mounted at a round or wave boundary.
- **E15 evidence: corrected.** Only `.guideStepCard` is keyed (L18836); the `.globalPlayGuide` container persists. The fix still applies, because the container's height changes with wraps, and on the phone the dock gives it a fixed height.
- **E13 "ask the owner about pausing `CinematicStageFX`":** kept as a measured open point (risk 7), not done by default.

### Rejected outright

None. The only parts rejected are the CR-5 audience `wow` face and the CR-9 bloom choreography, for the reasons above.
