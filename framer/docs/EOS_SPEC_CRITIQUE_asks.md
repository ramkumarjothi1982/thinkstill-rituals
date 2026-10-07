# EOS SPEC critique: user-ask coverage and experience

**Reviewed:** `docs/EOS_SPEC.md` v1.1 and `src/eos/00_eos_core.jsx` v1.1.0, checked against the user's verbatim request.
**Lens:** does each ask land as an *experience*? The asks are: arrows in every game, readable text, all dots merging to the centre, every game reviewed plus new games, emotion-first instant relief, a non-clinical negative-to-positive dopamine flip, a healthy addictive loop, viral, hypnotic, and Pixar / Inside-Out quality.

**How it was checked.** Every claim below was checked against the spec text, the core source, the research docs (catalogs, audits, both designs) or a live run of the current build. The live runs were throwaway scripts in `/tmp/eos_critic/`:
- `small.mjs` measured tiny text in the input, menu, play, finish and reveal stages for HOT POTATO at 1280×860 and 390×844.
- `t.js`, `s.js` and `t2.js` ran the core `eosDetectEmotion` and the spec's `EOS_SAFETY_LEX` on real phrases.

**Severity.**
- **P0:** fix in the spec before builders start; otherwise an ask is visibly unmet.
- **P1:** should ship in this build.
- **P2:** polish, or next batch.

## Scorecard

| user ask | spec covers it in | verdict | blocking issues |
|---|---|---|---|
| Arrows in **every** game | §3 (110 ids + `data-eos-*`) | **Partial.** Every game gets an arrow at the *start*. The second step of multi-step games, the check-in and the reveal interactions get none. | A1 A2 A3 |
| Tiny text (score, sparks…) readable | §4 | **Partial.** The audit only measured `stage-play`. The menu, reveal and payoff text still render at 7-10 px. | B1 B2 B3 |
| **All** background dots merge to the centre | §5 | **Mostly.** There are three different "centres", and the dust never reflects how calm the user is. | C1 C2 |
| Went through all games + new games | §3.10, §7, §8 | **Partial.** 17 games are silently never routed. 2 games that both designs specified (jealousy, overwhelm) are deferred. | E11 G1 |
| Emotion-first instant relief (panic, anger, anxiety…) | §6, §7 | **Partial.** A panicking user who accepts the defaults gets FINGER TRAP, not BIG SIGH. 16 common inputs detect nothing. Panic has no 1-tap path. | D1 D2 D3 D4 |
| Non-clinical dopamine flip, negative → positive | §2, §6.6, §11.9 | **Weak inside the 110 games.** The flip is only a companion face plus a bloom. The payoff takes ~12-15 s, and a guided breath runs after every game. | E1 E2 E3 |
| Healthy, "addictive in a positive way" | §9 | **Partial.** The collection runs out in about 8 days (39 faces). ⚡ can't be spent on anything. GOOD days are hidden. | F5 F6 D8 |
| Viral | §9.3 | **Weak.** There is no inbound link, no 9:16 card, no weekly card and no sound signature. | F1 F2 F4 F7 |
| Hypnotic | §5, §8 | **Good base.** The dust should mirror how calm the user is. | C2 F8 |
| Pixar / Inside-Out quality | §2, §8 | **Good world, missing payoffs.** "Who's at the controls?" is never resolved, the memory orb never flies to the shelf, and there is no testable quality bar. | E1c E5 E12 E16 |

---------------------------------------------------------------------------------------------------
## A. Arrows in every game (G1)

**A1 [P0] The check-in arrow has no renderer, and it would bias the choice.**
- *Problem.* §6.2 says first-timers see "TAP HOW YOU FEEL" via `eosTarget` on the first orb. But `EosGuideArrows` is mounted only inside `{stage === "play" && selected ? …}` (I1-E3), so nothing reads `data-eos-target` in `stage-input`. Pointing at the first orb (PANIC) would also anchor people's choice.
- *Fix (§3.2 exports).* Add `EosHandHint({ target /* Element | selector */, root, g, label, n, ms, dir, d, reduced, onlyIfIdleMs })`:
  - It is the same `svg.eosHand`, chevron, label, ring and `.eosCount`, but stand-alone: it is positioned with `eosRelRect(target, root)` and has `pointer-events: none`.
  - Expose it with `eosExpose("arrows", { EosHandHint })`.
  - Consumers call `eosApi("arrows").EosHandHint` and render nothing if it is absent.
- *Fix (§6.2).* Step 1 uses `g:"choose"`: the gold halo hops across all 8 orbs and the hand rests on NOT SURE in the centre, with the label "TAP HOW YOU FEEL". Step 2 uses `g:"drag", dir:"lr"` on the dial ("SLIDE IT") the first time only, then `g:"tap"` on LET'S SHIFT IT after 3 s idle. Remove the "eosTarget on the first orb" sentence.

**A2 [P0] Reveal interactions are unguided.**
- *Problem.* The Still Moment `heart` needs a 3 s press-and-hold, `spark` needs 3 taps on the beat, and the "How loud is it now?" dial needs a tap or drag. None of them has an arrow, and they come right after the game (where the player had one).
- *Fix (§6.6).*
  - `EosStillMoment` renders `EosHandHint`:
    - heart: `g:"hold", ms:3000, "HOLD IT LIKE A WARM MUG"`
    - spark: `g:"taps", n:3, "TAP ×3 ON THE BEAT"`
  - The meter dial gets `g:"drag", "SLIDE TO RIGHT NOW"`.
  - Timing: show at 600 ms, hide on touch, re-show after 3 s idle.
- *Acceptance (§6.7):* the hand is visible within 1 s in each of the three.

**A3 [P0] When a game moves to its next step, the arrow vanishes for 4 s.**
- *Problem.* §3.5 re-shows the arrow only after 4 s idle (6 s for veterans), after a missed tap, or never (when progress rose). So after GRAB THE HAMMER (3, 4, 9, 16, 19, 43, 96), OPEN THE DRAWER (28, 38), FOLD (40), INSERT A COIN (88), PICK ONE (98, 107, 94, 106) or CATCH IT (72), the player is left with no guide for step 2. That is exactly the step the catalog says people fail.
- *Fix (§3.5, new row "stage advance").* 350 ms after every `pointerup`, re-resolve. If the winning stage *index* or its resolved element changed, re-show immediately at the current level with the new stage's label, and reset the `×n` badge. This applies whether or not progress rose. It does not count as an idle re-show (no level escalation).
- *Acceptance (§3.12):* for 3, 28, 40, 88, 98 and 107, `arrows.state().label` equals the stage-2 label within 800 ms of completing stage 1.

**A4 [P1] The `×n` count badge is invisible exactly when it counts.**
- *Problem.* §3.1 says `.eosCount` "counts down on each pointerdown". §3.5 fades the whole layer 160 ms after any finger-down.
- *Fix.* For `taps` stages, keep only `.eosCount` pinned to the target's top-right corner while the stage is active; hand and label stay hidden.
  - On each decrement: pop it (`scale 1.25 → 1`, 160 ms) and play `eosTone(eosNote(n - left))`.
  - At 0: burst it (gold ✓).
  - Hide it when the stage changes.

**A5 [P1] Drags get no live feedback, while holds do (`.eosHoldLive`).**
- *Problem.* The catalog lists drag failures that the arrow's demo alone won't fix: the 31 diagonal, 48 "fails often", the 7 x-axis only, the 36 speed rule "invisible", 49 and 8.
- *Fix (§3.6, add `.eosDragGoal`).* On pointerdown inside a `drag`, `slow`, `swipe` or `sling` target:
  - Draw an end-point ring at `d` along `dir`, plus a trail that fills with the finger's projected distance.
  - When the threshold is reached, flash green; sling also shows "LET GO!".
  - For `slow`, the trail doubles as a speed gauge: green under the stage's max px/s, amber above with "slower… 🐢".
  - Stage keys `maxSpeed` (px/s) for 36 and 44, and the 112 cool phase.

**A6 [P1] `own:true` games show no label on the first play, even though their own cues are unreadable.**
- *Problem.* Measured: `.hotPotatoGuide>span` is 6 px at 390. `.keepDropMicroGuide`, `.ftCue`, `.xrayDragGuide span` and `.rainPullHint span` are also in the §4.2 offender list.
- *Fix (§3.5).* For `own:true`, use level 2 while `eosLearnedCount(id) < 1`, then level 1.

**A7 [P1] The acceptance test proves only the first stage.**
- *Fix (§3.12).* `eos_drive.finishGame` must assert, before performing *each* stage of `EOS_GESTURES[id]`, that `arrows.state().visible` became true and that `label` matched that stage, at both sizes. Add the check-in hint (A1) and the reveal hints (A2) to the list.

**A8 [P2] The label-overlap list is incomplete.**
- *Fix (§3.4 step 8).* Also avoid `.eosCompanion`, `.eosSafetyCard`, `.eosWorldChips` and the HUD pill row.

---------------------------------------------------------------------------------------------------
## B. Tiny text (G2)

**B1 [P0] Offenders missing from §4.2 / §4.3, measured live on the current build.**

| element | 1280 | 390 | why it matters |
|---|---|---|---|
| `.releaseChoiceMenu > .releaseChoiceGroupLabel` ("15 SIGNATURE RELEASES") | **7 px** | **7 px** | `EosMenuGroup`'s "FOR YOUR ANGER" label reuses this markup, so it renders at 7 px |
| `.releaseShiftCheck > .releaseReplaySame` ("↻ AGAIN") | 8.4 | 9 | stays visible beside the meter |
| `.releaseCompleteSideNav` (‹ PREVIOUS / NEXT ›) | 10 | 8 | reveal |
| `.releasePersistentFinalMessage > span` ("THE HIDDEN PART GOT SMALLER") | 9.8 | 10 | reveal headline copy |
| `.releaseShiftChoices > button` ("YES ✓") | 9.3 | 10 | when the check-in prop is off |
| `.hotPotatoStage > .hotPotatoPayoff` ("ALL COOLED") | – | 10 | the game's own payoff line |
| `.shelfGuideV2 > span` | 11 | – | SHELF IT is routed for anxiety/overwhelm |
| `.coinReleaseStage > .coinReleaseHint` | 11.3 | – | |
| `.realVacuumMachine text` (SVG "CYCLONE") | 8 | – | |
| `.tsDynamicActionCue > .tsDynamicActionArrow` | 9.9 | – | |

*Fix (add to `EOS_READ_CSS`):*
```css
${EOS_A} .releaseChoiceMenu .releaseChoiceGroupLabel{font:900 13px/1.2 var(--eos-font)!important;letter-spacing:.08em!important}
${EOS_A}.stage-reveal :is(.releaseReplaySame,.releaseCompleteSideNav){font:800 14px/1 var(--eos-font)!important;min-height:44px!important}
${EOS_A}.stage-reveal .releaseShiftChoices>button{font:900 15px/1 var(--eos-font)!important;min-height:48px!important}
${EOS_A}.stage-reveal .releasePersistentFinalMessage>span{font-size:max(15px,1em)!important}
${EOS_A}.stage-play .releaseGameHost :is(.hotPotatoPayoff,.shelfGuideV2>span,.coinReleaseHint,.tsDynamicActionArrow,[class*=Payoff],[class*=payoff]){font-size:max(15px,1em)!important}
@media (max-width:560px){${EOS_A}.stage-reveal :is(.releaseReplaySame,.releaseCompleteSideNav){font-size:13px!important}}
```
For SVG `text`, see B5.

**B2 [P0] The readability evidence covers one stage out of six.**
- *Problem.* All 110 audit records are `stage-play` (`stageAfter` = `stage-play` ×110). Input, menu, finish hold, reveal, check-in, shelf and safety card were never measured. `EosTextFloor` is disabled in `stage-input`, so the menu depends on CSS alone. The user's example ("score, sparks") changes *during* play: the step payout `.tsRewardPayout` only exists right after a hit.
- *Fix (§4.4).* Run `EosTextFloor` in `stage-input` while `.releaseChoiceMenu` is open.
- *Fix (§4.7).* Run `readability.scan()` in 8 states: input; menu open; play start; play right after the first hit (payout + `.globalFeedbackCopyLayer` visible); finish hold (`.globalFinishFeedbackCopy`); reveal with the meter; reveal after the payoff; Orb Shelf + safety card.
  - Games: POP, CRUSH, HOT POTATO, CLEANSE, RAIN OUT, 111-118.
  - Sizes: 1280×860 and 390×844.

**B3 [P1] The floor is softer than the user's complaint and than the spec's own HUD rule.**
- *Problem.* §4.1 says "HUD numbers 15-18", but the spark/token/chain pills get 13 / 12, and the phone floor is 11 px.
- *Fix.*
  - Floor: 12 px at every width (`EosTextFloor` uses 12 even ≤560).
  - `.tsShiftRewardPill` and `.tsShiftLevel>b`: **14 / 13**, height 30 / 28.
  - `.engineProgressText`: 14 / 13.
  - Do not set `animation` in the pill rule, so the arcade's `tsRewardPillHit` pop (the spark reward "juice") survives.

**B4 [P1] The phone header hides the brand name.**
- *Problem.* §4.3 (≤560) hides `.releaseTitleBrand` ("THINKSTILL", measured 8 px) and keeps "EMOTIONAL RELEASE CONSOLE" ellipsized (shown as "MOTIONAL…"). A viral product must show its name.
- *Fix (≤560).* Show `.releaseTitleBrand` at 15 px/900 as the title; hide `.releaseTitleMain` and `.releaseTitleBy`.
- *P2.* Change only the `title` prop *default* to `"THINKSTILL HQ"`, as `design_pixar` §0 suggested. Saved instances are unaffected.

**B5 [P2] `EosTextFloor` miscomputes SVG text.**
- *Problem.* computed `font-size` × `eosStageScale` ignores `viewBox` scaling.
- *Fix.* For SVG `text`, measure `getBoundingClientRect().height / k`. If it is too small, list the selector in CSS rather than writing an inline font size; inside a scaled viewBox, user units ≠ px.

---------------------------------------------------------------------------------------------------
## C. All background dots merge to the centre (G3)

**C1 [P1] The dust layers converge on three or four different points.**
- *Problem.* The layers aim at different targets:
  - `.tsPxDust` → `left 50% / top 48%` of the **whole component** (header and composer included).
  - `.cinemaDust` → 50% / 50% of each game's arena.
  - `.eosCore` → 50% / 50% of `.releaseStage`.
  - The idle abyss → 50% / 52%.
- On phone (header 48 px, composer 106 px) they sit 30-60 px apart, so dust visibly "merges" into empty space beside the glowing core.
- *Fix (§5.2 / §5.3).*
  - `EosThoughtFlow` measures the `.eosCore` centre every 1 s and on resize.
  - It writes `--eos-cx/--eos-cy` as a percentage of each container onto `.tsPxRig` and onto every `.cinemaDust`. Style-attribute writes are ignored by both wrapper MutationObservers, by the same argument §4.4 uses.
  - The keyframes become `eosDustX{to{left:var(--eos-cx,50%)}}` and `eosDustY{to{top:var(--eos-cy,48%)}}`.
- *Acceptance (§5.4):* ≥ 70% of sampled dots end within 24 px of the core centre in input, play and reveal, at both sizes.

**C2 [P1] The dust does not mirror the feeling (the "hypnotic" part).**
- *Problem.* The Pixar bible says dust speed and brightness *are* mental noise. The spec runs a fixed 14-22 s regardless of state.
- *Fix (§5.2).*
  - `EosThoughtFlow` sets `getAnimations().forEach(a => a.updatePlaybackRate(r))` on its lanes, with `r = 0.7 + 0.09 × intensity × (1 − progress/100)`. `updatePlaybackRate` changes speed without position jumps.
  - Add `.eosJitter` (±2 px wobble) while the check-in dial is ≥ 7.
  - Result: when you say "9", the dust churns; as you play, it visibly slows and smooths. You watch your mind settle.
  - Reduced motion: none of this.

**C3 [P2] The merge is not legible.** Add an `eosAbsorb` twinkle on the core every ~2.8 s (a ring scaling .6 → 1.1, opacity .5 → 0), and drift `.tsPxBokeh` slowly inward (60 s), so that everything comes home.

**C4 [P1] The acceptance test checks motion but not visibility.**
- *Fix (§5.4).* In POP, CRUSH, BURN, RAIN OUT, HOT POTATO, BLACK HOLE, SEND TO SPACE, 111, 114 and 117, at least 8 dust points must be visible: no ancestor between the field and the viewer may paint an opaque background over their centres. Check with a screenshot pixel delta or computed backgrounds along `elementsFromPoint`.

---------------------------------------------------------------------------------------------------
## D. Emotion-first instant relief (G4 / G6)

**D1 [P0] A panicking user who accepts the defaults is routed to FINGER TRAP, not BIG SIGH.**
- *Problem.*
  - The dial is "pre-lit at 6" (§2.2, §6.2), which is the mid band, and `panic.mid` starts with 102.
  - The typed path has the same result: "my boss yelled at me and I feel panic" gives `eosDetectEmotion` intensity **5** (verified), so mid band, so 102.
  - This contradicts §7.1 ("mid → the signature mechanic") and the Pixar storyboard, whose default was 7.
- *Fix.*
  1. Core: add `dial` per emotion and pre-light the dial at it:
     `panic 8 · anger 8 · fear 7 · overwhelm 7 · anxiety 7 · shame 6 · sad 6 · lonely 6 · overthinking 6 · jealous 5 · numb 5 · good 6`.
     If words exist, use `max(dial, eosGuessIntensity(raw))`.
  2. Set `panic.mid = [111, 102, 36, 77, 113, 71, 55, 11]`.
  3. `eosDetectEmotion`: intensity floor `max(n, EOS_EMO[id].dial - 1)`.

**D2 [P0] Panic has no 1-tap path.**
- *Problem.* Today it takes tap orb → dial → GO (1.2 s of animation), then BIG SIGH's "3 s intro". The user's own example is panic, and the ask is "instant".
- *Fix.*
  - **Express orbs.** Tapping PANIC (or long-pressing any orb) launches its high-band hero immediately via the orb-dive, with `before = null`. The shift meter's existing "Before you started / Right now" mode collects both numbers afterwards.
  - **111:** intro ≤ 1 s; the orb is holdable from mount; the arrow appears at 500 ms.
- *Acceptance:* PANIC tap → first BIG SIGH hold possible in ≤ 2.0 s.

**D3 [P0] Detection misses everyday words, and mislabels one common phrase.**
- *Problem.* Verified by running the core: these all return `null`:
  "tension", "tensed", "can't stop shaking", "dizzy and sweaty", "want to punch something", "want to scream", "hopeless", "got ghosted", "we broke up", "rejected", "insecure", "imposter", "can't sleep, mind racing", "ugly", "useless", "a burden", "stuck", "restless".
  - "tension" is among the most common Indian-English words for anxiety, and the default support lines include India.
  - "everyone hates me" returns **anger**; it should be lonely or shame.
- *Fix (core `EOS_LEXICON`, appended entries).* All verified: each phrase above then detects as noted, and "my boss yelled at me", "this traffic is killing me" and "cut the loop" are unchanged.
```js
panic:     [/\bshak(?:ing|y)\b|\btrembl\w*|\bdizz\w*|\bsweat(?:y|ing)\b|\bheart\s+(?:is\s+)?beating\s+(?:so\s+)?fast\b/gi, 1.1]
anxiety:   [/\btens(?:e|ed|ion)\b|\brestless\w*|\bcan'?t\s+sleep\b|\bmind\s+(?:is\s+)?racing\b|\bjitter\w*|\bbutterflies\b|\bstressed\s+about\b/gi, 1.3]
anger:     [/\bpunch\w*|\bsmash\w*|\bscream(?:ing)?\b|\bexplod\w*|\bsick\s+of\b|\bwant\s+to\s+(?:hit|break)\b/gi, 1.2]
sad:       [/\bhopeless\w*|\bbr(?:oke|eak(?:ing)?)\s*up\b|\bbreakup\b|\bdumped\b|\bmiserable\b|\bdevastat\w*|\blost\s+(?:my|him|her)\b/gi, 1.3]
lonely:    [/\bghost(?:ed|ing)\b|\breject\w*|\babandon\w*|\bignored\b|\bunwanted\b|\b(?:every(?:one|body)|they\s+all|people)\s+hates?\s+me\b/gi, 1.4]
shame:     [/\binsecur\w*|\bself[-\s]?doubt\w*|\bimpost(?:o|e)r\w*|\bugly\b|\buseless\b|\bburden\b|\bpathetic\b/gi, 1.3]
overwhelm: [/\bdrained\b|\bdeadlines?\b|\bpressure\b|\bstuck\b|\btired\b/gi, 0.8]
// and in anger's first regex: \bhate[ds]?\b  →  \bhate[ds]?\b(?!\s+me\b)
```
Remove `\btense\b` from anxiety; the new `tens(e|ed|ion)` covers it. Add every phrase above to the §7.4 verified list.

**D4 [P0] The safety lexicon misses the most common ideation phrasings.**
- *Problem.* Verified: these return nothing:
  "I can't go on", "no point in living", "i dont want to be alive", "life isn't worth living", "sleep and never wake up", "nobody would miss me", "I'm a burden", "I want to disappear", "I hate my life", "what's the point anymore".
  When they are missed, routing stays destructive and the share card stays on.
- *Fix (§10.1).* Append to `selfharm`:
  ```
  |can'?t\s+go\s+on|no\s+(?:point|reason)\s+(?:in\s+)?(?:living|being\s+alive|going\s+on)|(?:don'?t|do\s+not)\s+want\s+to\s+be\s+alive|life\s+(?:is\s*n'?t|is\s+not|isnt)\s+worth\s+(?:living|it)|not\s+worth\s+living|sleep\s+and\s+never\s+wake\s+up|nobody\s+would\s+(?:miss|care\s+if)\s+me|(?:i'?m|i\s+am|feel\s+like)\s+(?:such\s+)?a\s+burden
  ```
  Add `EOS_SAFETY_LEX.soft = /\b(hopeless|hate\s+my\s+life|give\s+up\s+on\s+everything|what'?s\s+the\s+point\s+(?:anymore|of\s+(?:living|anything|trying|me))|want\s+to\s+disappear|can'?t\s+do\s+this\s+anymore)\b/i`. `EosSafetyScan` returns `"soft"` for it.
- *Verified:* the must-not-match list is still clean, plus "what's the point of this meeting" and "I could kill for a coffee". One accepted false positive: "I can't go on like this at work lol". The card is gentle, as §10.1 says.

**D5 [P1] Starter words put catastrophic phrases in the user's mouth.**
- *Problem.* The panic `starter` ("…cant breathe…") and `seeds` ("can't breathe") show a catastrophic belief the user never typed, as huge words in the game.
- *Fix (core).* Panic `starter: "racing heart tight chest what if too fast right now"`; replace the seed "can't breathe" with "shaky". Rule for every starter and seed: sensations and situations, never catastrophic predictions.

**D6 [P1] Character names appear before they are introduced.**
- *Problem.* Step 2 says "How loud is RUSH right now?" and the rewards say "RUSH bond 2/5", but the step-1 orb shows only "ANGRY · boiling over".
- *Fix.*
  - The step-1 orb gets a 12 px name tag ("RUSH") under the sub-line.
  - The first-ever step 2 says "Meet RUSH, your anger. How loud is RUSH right now?"
  - The meter asks "How loud is RUSH (anger) now?"

**D7 [P1] Orb sub-lines don't use the words people actually say.**
- *Fix (core `sub`).*
  - PANIC "heart racing"
  - ANGRY "frustrated · boiling"
  - ANXIOUS "nervous · what-ifs"
  - OVERTHINKING "can't switch off"
  - OVERWHELMED "stressed · too much"
  - SAD "low · heavy"
  - LONELY "left out"
  - ASHAMED "guilty · not enough"
- Check that "OVERTHINKING" (12 chars) fits the 84 px phone cell; if not, use 13 px with letter-spacing .02em.

**D8 [P1] GOOD is buried under "more feelings", so no habit forms on good days.**
- *Problem.* `design_relief` G.2: a habit trained when calm becomes automatic when panicked.
- *Fix (§2.1, §6.2).* Add a small "☀ good day? bank it" chip on the ring (a chip, not an orb). It launches 117 in savour mode.

---------------------------------------------------------------------------------------------------
## E. Non-clinical dopamine flip, negative → positive, in every game (G5 / G6)

**E1 [P0] "Redesign all the games" is delivered only as routing, arrows and hint text.**
- *Problem.*
  - §11.9's positive flip is the companion face plus the bloom.
  - 44 / 110 games have no relief role: 27 in the vault and 17 silently unrouted (E11).
  - Inside a game, POP-for-panic and POP-for-anger look identical.
- *Fix.* Add three universal, engine-free layers in a new task `mood` (`src/eos/14_eos_mood.jsx`), mounted in the I1 play fragment:
  - **(a) Colour script `EosMoodGrade`** (Pixar's colour-script idea).
    - A full-stage layer *above* the game: z 54, `pointer-events:none`, `mix-blend-mode:soft-light`, opacity .22 → .08.
    - Its gradient interpolates from the emotion's loud palette to its calm palette as `eosProgressOf` rises:
      - anger: red-orange → cool teal
      - panic: storm-violet → dawn gold
      - sad: slate-blue → warm peach
      - numb: grey + `saturate(.6)` on the stage FX → full colour
      - anxiety: static-violet → clear sky
      - shame: bruise-mauve → warm rose
      - overwhelm: murky navy → open cyan
      - overthinking: tangled purple → mint
    - Every one of the 110 games then visibly moves from negative to positive *while being played*.
    - Reduced motion: steps at 33 / 66 / 100.
  - **(b) Flip bloom.** On `.eosGather`, 3 positive words rise out of the Still Point bloom at ≥ 20 px, read from core `flip`:
    - panic ["safe", "slow", "right here"]
    - anger ["cool", "clear", "strong"]
    - anxiety ["steady", "here", "okay"]
    - overthinking ["clear", "quiet", "done"]
    - overwhelm ["space", "one thing", "enough"]
    - sad ["lighter", "warm", "held"]
    - lonely ["seen", "connected", "not alone"]
    - shame ["kind", "human", "enough"]
    - fear ["brave", "closer", "smaller"]
    - jealous ["my glow", "my path", "grateful"]
    - numb ["awake", "colour", "alive"]
    - good ["savoured", "kept", "mine"]
    - The user's negative words went in; positive words come out.
  - **(c) Pay off "Who's at the controls?"** The payoff headline names the new state, e.g. "ANGER 8 → 2 · COOL", with the sub-line "RUSH handed back the controls ✦". The character slides aside while STILL (or the calm face) takes the centre.

**E2 [P0] "−5" reads as losing points.**
- *Problem.* In game language, minus means loss. The countdown also uses "descending pitch", which sounds deflating.
- *Fix (§2.4.3, §6.6.3).*
  - Stamp: "**5 LIGHTER ✦**" for `better:"down"`, "**5 BRIGHTER ✦**" for `up`.
  - The count ticks can descend but must *resolve* on a rising major arpeggio + `sfx("chime")` + `eosHaptic("finish")`.
  - The share card keeps "ANGER 8 → 2".

**E3 [P0] The payoff takes ~12-15 s, and the guided breath after every game is the most "therapy-homework" part.**
- *Problem.* The time is the wrapper finish hold (3 s legacy / 4 s new, verified at L18400 / L19456) + Still Moment 6 s + rating. The spec promises "Feel it ≤ 8 s".
- *Fix (§2.4.1, §6.6.1).*
  - **When it runs.** Only when the game was a discharge or destroy game, or the band is high and the emotion is panic, anger, fear or overwhelm.
  - **When it never runs.** After breath / slow games: 111, 112, 109, 65, 66, 69, 80, 36, 44.
  - **Skipping.** Tap anywhere to skip, from 0 s.
  - **Veterans.** With ≥ 5 completed loops, show a 1-tap chip "one big sigh? ›" instead of auto-starting.
  - **Diegetic framing.** "Blow the memory orb home": hold to fill it, sip once more, release to blow it into the ◉ chip. Copy has no "breathe in / out"; the action *is* the breath.
- *Acceptance (§6.7):* finish → "8 → 3" visible in ≤ 7 s with the Still Moment skipped, ≤ 12 s with it.

**E4 [P1] Rating feels like a survey.**
- *Problem.* With no check-in, the meter shows two dials ("Before you started" + "Right now"), which is homework.
- *Fix.*
  - One dial, "Right now", plus a "before" chip prefilled from `intensityGuess` ("you seemed about 7 · change").
  - The after-dial drives the character live: scale `.85 + .04n`, the face goes loud → softer → calm as n drops, and the dust slows (C2). Rating becomes turning the feeling down by hand.
- Also fix §2.5 ("one widget") vs §6.6 ("two compact dials") (H1).

**E5 [P1] The memory orb never flies to the shelf.**
- *Problem.* This is the Inside-Out signature moment. `design_pixar` G.2 had it; the spec dropped it.
- *Fix (§6.6.4).* After the payoff, the orb arcs into the ◉ world chip on a motion path, with a squash on landing. The chip bumps "+1" with `sfx("plink")`. Reduced motion: cross-fade.

**E6 [P1] The reveal is overloaded and repeats itself.**
- *Problem.* "RELEASE COMPLETE · +554 STILL", `.releasePersistentFinalMessage` ("YOU BROUGHT IT INTO VIEW"), 14 floating `ArcadeCharacterAtmosphere` faces, the meter, the rewards line, 4-5 buttons and PREV/NEXT all compete for attention.
- *Fix (§6.6, CSS).*
  - While `.eosShiftMeter` is in steps 1-3: hide `.releaseCompleteCard>small`, `.releasePersistentFinalMessage` and `.releaseCompleteSideNav`, and dim `.arcadeCharacterAtmosphere` to .3. Restore all of them after the payoff.
  - Buttons: max 3 visible (I'M GOOD ✓, ONE MORE ▶, SHARE MY SHIFT); "↻ same game" becomes a text link.

**E7 [P1] 112 doesn't satisfy "release the anger".**
- *Problem.* The eruption is only 6 taps (≤ 8 s); a furious user wants to smash.
- *Fix (§8.2).*
  - Erupt taps scale with `before`: 6 (≤ 6), 9 (7-8), 12 (9-10), still ≤ 12 s.
  - Each tap escalates rock size, shake and pitch, with combo "BOOM ×n".
  - Then "Nice. Now watch it cool…".
  - Keep the cool-down as the active ingredient.

**E8 [P1] Invisible "too fast / let go too early" rules in routed panic and anger games.**
- *Problem.* None of these give feedback:
  - 36 CLOUD PASS: speed rule invisible (panic high).
  - 65 PAUSE: early release silently halves the meter (panic high).
  - 69 PULSE: fast taps silently ignored (panic high).
  - 13 SQUASH: silent halving (anger mid).
  - 70 METRONOME: off-beat taps give only a quiet click.
  - `EosLegacyGuards` covers only 11 and 64.
- *Fix (§11.7, "almost!" guards, never "wrong").*
  - 36: drag faster than the threshold → "slower… 🐢" + `.eosDragGoal` speed gauge (A5).
  - 65 / 13: early release → "keep holding…".
  - 69: a tap < 650 ms after the last → "wait for the pulse…" + a ring flash on the pulse.
  - 70: off-beat → "every other beat ♪".

**E9 [P2] 68 DRUM IT sounds like a grind.**
- *Problem.* It is numb high #2 and anger mid, but every pad plays the same `sfx("tap")` (catalog).
- *Fix (guard, sound only).* On capture `pointerdown` of `.drumKit button:nth-child(n)`, play `eosTone` kick / snare / hat / clap when sound is on. It becomes a real drum.

**E10 [P1] 99 legacy games show "GAME PROGRESS · n%" (L18804).**
- *Problem.* The new wrapper narrates the feeling instead (`{shiftReward.meter}`, e.g. "SLOW-DOWN · 33%").
- *Fix (new I1 edit, ×1).*
  - Anchor `                        GAME PROGRESS · {progress}%` → `                        {eosMeterWord(p.game)} · {progress}%`.
  - `eosMeterWord` (fixes module, `typeof` guarded) returns `EOS_EMO[eosCurrentEmotion()]?.meter || "SHIFT"`.
  - Add the anchor to `dev/eos_integrate.py`.

**E11 [P1] 17 games are silently never routed, and the thin lists will bore repeat users.**
- *Problem.*
  - Ids 3, 6, 7, 8, 16, 20, 26, 27, 44, 46, 48, 49, 58, 60, 66, 70, 103 are in no route and not in `EOS_VAULT`, and nothing documents why.
  - lonely has 6 ids, good 3, jealous 7, numb 7.
  - Routes include catalog-2/5 games whose flaw the spec does not fix: 72, 81, 79, 51, 74, 28, 13.
- *Fix (§7.2).*
  - Add `EOS_BENCH` (documented reasons) or move each orphan into the vault.
  - Route 66 BUFFERING in panic and anxiety high: the arrow's breathing palm now fills its empty wait.
  - Route 44 VELCRO in panic mid, and 8 METEOR (after the §11.6 fix) in anger mid.
  - Move 72, 81, 79, 51 and 74 to the tail of their lists.
  - Widen the thin lists: good → `[117, 106, 114, 1, 25, 105, 107, 53]`; numb → `[117, 68, 1, 106, 107, 25, 100]`.
  - Add the per-game verdict appendix (id → hero / route / bench / vault + reason), so "we went through all 110" is visible.

**E12 [P1] The companion duplicates the scene's character in all 8 new games.**
- *Problem.* 111 SYNC = panic SYNC; 112 RUSH; 113 GLITCH; 114 DROP; 115 PATCH; 116 LOOPIE; 117 SYNC = numb; 118 GLITCH = fear. Two copies of the same character on screen.
- *Fix.*
  - `eosRegisterGame` opts gains `char`, stored in `EOS_GAME_META[id].char` (core change). `EosCompanion` hides when `char === companion char`.
  - Give each character its own voice lines:
    - RUSH "HAH. take that!" / "phew… cooling"
    - SYNC "slower… nice"
    - GLITCH "static clearing…"
    - LOOPIE "loop… broken!"
    - DROP "let it rain"
    - PATCH "you're doing okay"
    - STILL "look at you go"
  - Optional `eosTone` "voice blips".
  - Phone position: 8 px under the *measured* bottom of `.engineProgressHud`, not a fixed `top: 74px`; the HUD wraps to two rows after §4.3.

**E13 [P2] 116 speaks the user's private words aloud on the speaker.**
- *Fix (§8.6).* `speechSynthesis` off by default, with an in-game 🔊 "say it out loud" chip. The default is squeak tones plus "say it with me (or just tap)".

**E14 [P1] 113 GROUND CONTROL is the anxiety hero and the most homework-like new game.**
- *Problem.* 5 reading missions, honour-system taps, and the player has to look away from the game.
- *Fix (§8.3).*
  - Three beacons become on-screen "spot it" finds: fog hides 5 bright objects; sweep the beacon light to reveal one, tap to lock it in.
  - Two are body beacons that are *holds*: "press your feet down: hold while you do", "drop your shoulders: hold".
  - Missions are ≤ 4 words with big icons.

**E15 [P2] New games need replay variety.**
- *Fix (§8.0, §8.9).* At least 3 seeded scene variants per game (`variationSeed`), plus a local-time palette (dawn / day / dusk / night), so a daily BIG SIGH player doesn't see the same night every time.

**E16 [P1] The "Pixar quality" bar is not testable.**
- *Problem.* §8.9 just says "screenshots reviewed".
- *Fix.* Each builder ticks this checklist with screenshot paths:
  - 3 depth layers (sky / props / character).
  - Key + rim light on the character.
  - Squash & stretch on every touch.
  - A character face that changes ≥ 2× and ends on a positive pose.
  - ≤ 1 instruction line on screen.
  - Baloo 2 only.
  - No flat rectangles as primary objects.
  - Colour script loud → calm.
  - Every touch answered within 50 ms with visual + sound + haptic (log timestamps in `__eosPreview.sfx`: core change `{kind, t}`).

---------------------------------------------------------------------------------------------------
## F. Healthy, addictive in a positive way, viral, hypnotic (G7)

**F1 [P0] The viral loop has no way back in.**
- *Problem.* The share caption has no deep link (`design_relief` G.4's challenge link was dropped), so a share can't bring a new player straight to a feeling.
- *Fix (§9.3 + check-in).*
  - When `shareUrl` is set, the caption URL is `${shareUrl}?eos=${emo}&t=${seconds}`.
  - On mount, the check-in reads `location.search` once (guarded). It preselects that orb and shows the banner "A friend shifted ANGER in 41 s. Your turn?" (never a comparison).
  - Then `history.replaceState` strips the params.

**F2 [P1] There is no 9:16 story card.**
- *Problem.* Both designs had 1080×1920; story / status is the main share surface.
- *Fix.* `eosMakeShareCard(shift, {format: "story" | "feed"})`. Phones default to story.

**F3 [P1] The share card carries no identity.**
- *Fix.* Add the mastery badge ("PANIC PILOT") and the loud → calm face pair, and rotate 3 captions per emotion (not one template).

**F4 [P1] The weekly recap card was dropped.**
- *Problem.* `design_relief` G.4 / `design_pixar` G.8 had a "My HQ week" card, the Wrapped-style identity share.
- *Fix.* Add "Share my week" in the Orb Shelf: orbs by character colour, days showed up, and points shifted, computed from `eos_sessions_v1` numbers only.

**F5 [P1] The collection runs out in about 8 days.**
- *Problem.* Memory-orb faces come from `RELEASE_PHASE_EMOTIONS.positive`, which is **39 faces** in total; at 5 orbs a day that is ~8 days. The repo ships **700** expressions (`bubble-expressions/`, `expressions_manifest.json`: 7 × E01-E100) and `thinkstill_750_expression_map.json`, which has a curated positive `"win"` face per ritual.
- *Fix (§9.2).*
  - Build-time extract `EOS_WIN_FACES = {char: [unique win ids]}` into the rewards module (a few hundred bytes). The orb face pool is `EOS_WIN_FACES ∪ positive`.
  - Bonds stay finite.
  - The first rated loop of each day is a guaranteed new face, "Expression of the Day" (relief G.2).

**F6 [P1] ⚡ can't be spent and personal progress is invisible.**
- *Fix.*
  - ⚡ milestones (250 / 1000 / 2500 / 5000) unlock cosmetic Thought-Dust styles and core colours: fireflies, aurora, snow, gold. This is hypnotic personalisation that never gates relief; store it in `eos_prefs_v1.dust`.
  - The shelf shows "points shifted: 47" (the sum of positive Δ; Pixar G.1) and "works best for you · ANGER: COOL THE VOLCANO (avg 5 lighter)".
  - The check-in CTA sub-line says "your best" when `personalDelta ≥ 2`.

**F7 [P1] There is no sound signature.**
- *Fix (shift module).* Add a 3-note ThinkStill "shift" sting on every payoff, plus a per-emotion finish chord (relief G.5): anger minor → major, panic a slow descending fifth that resolves up, sad a rising sixth. Gate it with the sound toggle. It makes the brand recognisable on shared screen recordings.

**F8 [P2] Optional hypnotic audio bed.** During check-in and play, a very quiet (gain ≤ .03) swell of filtered noise synced to the 10 s `eosBreathe` cycle. Only when sound is on and the arcade music is off.

**F9 [P2] First-run cold open.** Once per device, ≤ 3 s, non-blocking: STILL appears: "Hi, I'm Still. Your feelings are a crew. Tap whoever's loudest." It sets up the Inside-Out frame and introduces the cast (pairs with D6).

**F10 [P2] Use the owner's ritual library.**
- *Context.* The repo root has 1,000 rituals (`rush.json` … `still.json`, `thinkstill-modes.json`) with keywords, `mindBend` and `moveOn` copy per pattern. The spec never mentions them.
- *Fix.* Commit a generated `eos_flip_index.json` (keywords → short line, ~150 KB; too heavy to inline in the single Framer file). The reveal fetches it lazily from raw.githubusercontent (the same origin as the faces). It shows one personalised line under the payoff and falls back silently to E1(b)'s in-bundle lines. Also mine the library for the next new-game batch.

---------------------------------------------------------------------------------------------------
## G. New games (G5)

**G1 [P0] Two specified heroes are deferred, so OVERWHELMED and JEALOUS have no game of their own.**
- *Problem.* OVERWHELMED is a *primary* ring emotion with no dedicated hero, and jealousy has none either. §8 defers `119 YOUR SPOTLIGHT` and `120 ONE THING` even though both designs fully specify them (`design_relief` F.9 / F.10, `design_pixar` 118 SPOTLIGHT SWAP). The user explicitly asked for more new games.
- *Fix.* Build them in this build as `29_eos_game_spotlight.jsx` and `2a_eos_game_onething.jsx`, following the §8.0 contract.
  - 119 (jealous; wins mode for GOOD): drag the spotlight from "their" trophy onto your shelf, then light 3 jars from chips.
  - 120 (overwhelm): dump the words into a funnel, swipe-sort them, then keep ONE tiny next step. It ends on "just this one ✓".
- *Routes:*
  - overwhelm `high [111, 120, 93, 21]`, `mid [120, 93, 95, 21, 87, 32]`
  - jealous `high [119, 115, 47]`, `mid [119, 47, 45, 25, 115]`, `low [119, 88, 117]`
  - good `[117, 119, 106, 114, …]`
  - `EOS_SECOND_ACT`: overwhelm `[120, 93, 111]`, jealous `[119, 115, 117]`
  - `EOS_GENTLE_IDS` += 119, 120

**G2 [P2] Next batch, documented only.**
- **HYPE FLIP:** pre-exam / interview / date nerves → "I'm excited" reappraisal (Brooks 2014).
- **CRINGE REEL:** an embarrassing moment replayed as a sped-up cartoon with a silly voice (humour distancing).
- **SHAKE IT OFF:** DeviceMotion shake for anger and stress, with tap fallback and a permission prompt only on tap.

---------------------------------------------------------------------------------------------------
## H. Vague or inconsistent spec text (fix wording so builders don't guess)

- **H1.** §2.5 says the reveal asks before/now "in one widget"; §6.6 says "two compact dials". Pick one (see E4).
- **H2.** §2.4 says "+25 ⚡ for checking in"; §9.2 pays it after the *after*-rating. Change the copy to "+25 ⚡ for showing up".
- **H3.** The banned-word list includes "therapy" and "session", but the required disclaimers (Orb Shelf footer, safety card) must keep "not therapy, diagnosis or a crisis service". State the exception, so a builder linting copy doesn't strip it.
- **H4.** §2.1 "Thought Dust (every background dot) spirals into it" vs §5.1 "`.tsPxBokeh` unchanged": state explicitly that bokeh is excluded (or adopt C3), so a reviewer doesn't fail the "ALL dots" ask on the blurred blobs.
- **H5.** §3.10 "W" uses L/N but ids ≥111 run in `GameEngine` only after I1-E11. Say that the arrows for 111+ depend on I1-E11 having landed, and that preview mode uses `EosEnginePreview`.
- **H6.** Core frozen vs. needed data. D1 `dial`, D5 starter/seeds, D7 `sub`, E1 `flip`, E12 `EOS_GAME_META.char`, and the `{kind, t}` sfx log all live in `00_eos_core.jsx`. Bump core to v1.2 *before* module builders start (one lead commit), or every module will invent its own copy.

---------------------------------------------------------------------------------------------------
## Fix order (cheapest high-impact first)
1. **Core v1.2 data:** D1, D3, D5, D7, E1(b) `flip`, E12 `char`. **Router:** D1, E11, G1 routes. **Safety:** D4.
2. **Arrows:** A3, A1, A2, A4, then A5. **Readability:** B1, B3, B4, then B2 acceptance.
3. **Reveal / shift:** E2, E3, E1(c), E5, E6, E4. **Mood layer:** E1(a), E1(b).
4. **Dots:** C1, C2. **Fixes:** E8, E10.
5. **Viral:** F1, F2, F5, F6, F7, F4, F3.
6. **New games:** G1 (119, 120); 113 rework E14; 112 escalation E7.
