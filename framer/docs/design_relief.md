# DESIGN: ThinkStill EOS — instant relief, guide arrows, readable HUD, converging dots, emotion-first loop

Lens: affective neuroscience (fast-acting regulation) × top mobile game feel (Supercell juice, Duolingo habit, Wordle share).
Baseline: `src/00_arcade.jsx` md5 `b9e220c3…` (22,786 lines), `src/99_pixar.jsx` md5 `8457fe0d…`. Inputs read: `map_main.md`, `map_engine_hud.md`, `catalog_A.md`, `catalog_B.md`, `audit_1/2/3.json` (110 games, live), screenshots in `dev/shots/audit/`.
Every line number below refers to that baseline; **edit by the quoted anchors** (all anchors listed in §I.3 were checked to occur exactly the stated number of times).

---------------------------------------------------------------------------------------------------
## 0. The whole proposal on one page

**The product loop (≤60 s, every session):**
```
NAME IT (≤5s)          PLAY IT (20-45s)                 FEEL IT (≤5s)              KEEP IT
pick a feeling orb  →  the ONE game that best moves  →  re-rate 0-10: "8 → 3"  →  memory orb + ⚡ + share card
+ how big (1-10)       that state at that intensity      (proof of shift)          (+ optional 2nd act if Δ<2)
(+ words / voice)      guided by an animated arrow
```
Naming the feeling is itself the first regulation step (affect labelling, Lieberman 2007), so the check-in is not overhead — it's the opening move of the game.

**Top decisions**
1. **Universal guide arrow overlay** (`EosGuideArrows`) mounted once beside `.releaseGameHost`, driven by a per-id gesture table covering all 110 games (+ new ones via `data-eos-*` attributes). 16 gesture animations (tap, ×N taps, hold ring, hold-and-release window, directional drag, drag-to-target, drag-outward, swipe, slingshot, scrub, choose, sequence, timing, alternate, wait, type). It shows at first play, hides on touch, re-appears when the user is stuck, and escalates to a spotlight mask on the third idle.
2. **Type floor:** nothing in `.tsArcade` renders under **12 px**; instructions ≥ **15 px**; HUD numbers ≥ **15 px**; the user's own words ≥ **15-16 px**. One ID-boosted CSS block, plus a new `EosPlayHud` relief meter that replaces the 8.3 px pills and fixes the ids ≥100 HUD overflow bug.
3. **Dots converge.** All ambient dots (Pixar `.tsPxDust`, per-game `.cinemaDust`, and a new in-stage `EosDotField` that replaces the invisible `InfinityField`) spiral into a breathing centre core. The core pulses at **6 breaths/min** (4 s in / 6 s out), so the background is a subliminal breathing pacer, and on finish it blooms into the Memory Orb.
4. **Emotion-first routing.** There are 12 check-in states, each tied to a character (RUSH, LOOPIE, GLITCH, DROP, SYNC, PATCH, STILL), with an intensity band (high 7-10 / mid 4-6 / low 1-3) and a ranked game list. High arousal always starts body-first (breath/discharge); cognitive games come only at mid or low intensity, because reappraisal works poorly at peak arousal.
5. **27 weak or duplicate games move to LAB.** They stay playable from the menu (drive.mjs keeps working) but are never auto-routed. 83 games stay routable.
6. **10 new games (ids 111-120)** fill the science gaps the catalogs found:
   - SIGH SURFER (physiological sigh, for panic)
   - LET OFF STEAM (discharge, then slow exhale, for anger)
   - GROUND CONTROL (5-4-3-2-1, for anxiety)
   - BROKEN RECORD (word-repetition defusion, for rumination)
   - PATCH UP (self-compassion and soothing touch, for shame)
   - SHADOW SHRINK (approach, for fear)
   - LANTERN SKY (common humanity and one micro-act of connection, for loneliness)
   - COLOUR RUSH (rhythm and behavioural activation, for numbness)
   - YOUR SPOTLIGHT (gratitude and self-affirmation, for jealousy)
   - ONE THING (offload, then a tiny next step, for overwhelm)
7. **Healthy compulsion.** Reward the ritual, celebrate the shift: XP comes for completing the loop, never for the size of the Δ, so there is no reason to inflate ratings. Other pieces:
   - Rolling "Calm Days 5/7" instead of a fragile streak.
   - 700 collectible character expressions as Memory Orbs.
   - Per-emotion mastery.
   - A privacy-safe share card: "ANGER 8 → 2 in 41s".
   - A visible exit after every loop.
8. **Safety card.** A first-person self-harm or abuse lexicon brings up a calm, non-blocking "you deserve real support" card with configurable crisis lines. While it's active, routing switches to gentle games and destruction copy is muted.
9. **Build:** 12 core `src/eos/*.jsx` modules (including a temporary stub file) plus one file per new game. Edits to `00_arcade.jsx` (§I.3): **16 required anchor edits** (E1-E15 + E7b; E13 and E14 have sub-parts) and 4 optional ones. Edits to `99_pixar.jsx`: 2, plus 1 optional. Every anchor was verified unique on the baseline. Work runs in 5 phases, with a stub file so modules can be built in parallel.

**Feel bible (applies to every touch, old games included via the overlay):**
- Respond within 50 ms to every press: squash, sound and an 8 ms haptic.
- Every success gets three layers within 100 ms: burst, rising-pitch sound and haptic.
- **Progress never goes backwards.** The saw-tooth bug is fixed in §I.3 E14.
- Never say "wrong". Mis-timing gets "almost!" and the meter is kept.
- Every game ends on a positive transform: a face flips to a positive expression and the core blooms.

---------------------------------------------------------------------------------------------------
## 1. Science → mechanic cheat-sheet (what each emotion needs in under 60 s)

| state | arousal | what works fast (evidence) | what to avoid | mechanic family |
|---|---|---|---|---|
| **Panic** | very high ↑ | **Physiological sigh / cyclic sighing**: double inhale, long exhale; 5 min/day beat mindfulness on mood and respiratory rate (Balban et al., *Cell Rep Med* 2023). Slow breathing near 6/min raises HRV (Lehrer & Gevirtz 2014; Zaccaro 2018). Paradoxical acceptance ("don't fight it"). | timing tasks with failure, typing, reading | hold-in / long-release breath, push-in (FINGER TRAP), slow-wins (CLOUD PASS) |
| **Anxiety / worry** | high | **Grounding** 5-4-3-2-1 (attentional deployment, Gross 1998). **Worry postponement** (Borkovec 1983). **Containment** without destruction. Defusion (ACT). | catastrophe-amplifying "and then?" (50 UNFINISHED SENTENCE) | seek-and-tap senses, shelve, park, push-in |
| **Anger** | high ↑ | **Arousal-decreasing activities reduce anger; arousal-increasing ones generally don't** (Kjærvik & Bushman meta-analysis, 154 studies, *Clin Psych Rev* 2024). Venting while ruminating on the target increases anger (Bushman 2002). So: a *short, playful* discharge (agency, ≤15 s), then a **mandatory cool-down** (slow exhale), plus humour (Samson & Gross 2012). | long smash loops with no cool-down, insulting the target | smash ≤15 s → vent slowly; heat → cool imagery |
| **Overthinking / rumination** | mid | **Word-repetition defusion**: ~30 s of repeating a negative self-word cuts discomfort and believability (Masuda et al. 2004). Pattern interrupt. **Temporal distancing** ("in 5 years?", Bruehlman-Senecal & Ayduk 2015). Third-person self-talk (Kross 2014). | re-assembling the thought (108 WORD SALAD) | spin / scramble the word, freeze, cut the loop, zoom out |
| **Overwhelm / stress** | mid-high | **Cognitive offloading** (Risko & Gilbert 2016). **Making a plan frees working memory from unfinished goals** (Masicampo & Baumeister 2011). Implementation intentions (Gollwitzer 1999). | precision chores (82 SEESAW) | sort away, keep ONE, make it tiny |
| **Sadness / grief** | low ↓ | Validate, then **soothe**, then a **gentle lift** (behavioural activation, Dimidjian 2011). Crying metaphor (110 RAIN OUT). Music for mood (Salimpoor 2011). | destroying the feeling (STOMP/SHRED) | rain out, float away, lanterns, soft music |
| **Loneliness** | low | **Common humanity** (Neff 2003). Prosocial micro-acts raise well-being (Curry et al. 2018 meta-analysis). People underestimate how good reaching out feels (Epley & Schroeder 2014; Kumar & Epley 2018). | fake "others online now" counters (dishonest) | light and release lanterns, then send one real signal |
| **Shame / guilt / inner critic** | mid | **Self-compassion** (Neff 2003; interventions reduce self-criticism, Ferrari et al. 2019). **Advice to a friend is wiser than advice to self** (Grossmann & Kross 2014). **Soothing touch** (hand on heart) blunts cortisol (Dreisoerner et al. 2021). | erase/burn only (teaches "hide it") | kind words to a buddy, hand on heart, turn the critic's volume down |
| **Fear / dread** | high | **Approach, don't avoid** (inhibitory learning, Craske 2014). Curiosity + labelling. Humour shrinks threat. | jump scares, bombs at high fear | shine light → the shadow shrinks into a tiny critter |
| **Jealousy / comparison** | mid | **Gratitude / "three good things"** (Emmons & McCullough 2003; Seligman 2005). **Self-affirmation** buffers threat (Cohen & Sherman 2014). Attention redeployment. | "beat them" framing | move the spotlight to your own wins |
| **Numb / flat** | very low ↓ | **Up-regulate**: rhythm, colour, novelty, movement. **Behavioural activation**: action before motivation. | slow, dim, silent games | drum the world back to colour |
| **Good / grateful** | — | **Savouring** amplifies positive affect. Banking good moments builds the habit on good days too. | — | colour/rhythm in savour mode, wins spotlight |

Rule of thumb that drives routing: **high intensity (7-10) → body first** (breath, hold, short discharge). **Mid (4-6) → the signature mechanic for that emotion. Low (1-3) → meaning and humour** (reframe, gratitude, absurdity).

---------------------------------------------------------------------------------------------------
## A. Universal guide arrows (every game, zero reading)

### A.1 What the user sees
A **Guide Spark** is a 52 px glowing "touch orb" (white core, emotion-coloured halo). It *performs* the gesture on the real target, leaves a dashed glowing trail with a chunky chevron head, and carries one short caps label (≤ 4 words, **15 px desktop / 14 px phone**, Baloo 2 900, dark-glass pill). Repeat gestures get a `×3` badge, holds get a filling ring, and sequence games get a number badge on the live target.

On the third time the user is stuck, everything except the target dims (a spotlight mask, as in a Clash Royale tutorial).

Visual tokens (copy the existing house cue look from `.tsDynamicActionCue` / `.ftArrow`, `map_engine_hud` §7):
- Orb: `radial-gradient(circle, #fff 0 22%, hsla(var(--eos-h),100%,72%,.9) 34%, transparent 70%)`, plus box-shadow `0 0 18px hsla(var(--eos-h),100%,70%,.85), 0 0 42px rgba(117,71,255,.35)`.
- Trail: 3 px dashed, `stroke: #d4ffff`, `drop-shadow(0 0 6px rgba(0,229,255,.9))`, animated `stroke-dashoffset`.
- Chevron: 30 px, same glow.
- Label: `rgba(5,14,26,.88)` glass with a 1 px `hsla(var(--eos-h),100%,70%,.55)` border, 999 px radius, `padding: 7px 12px`, white text, letter-spacing .06em.
- `--eos-h` is the checked-in emotion's hue (§D.1), with a fallback of 190 (cyan).

### A.2 Gesture grammar (16 kinds) — how each one animates

| `g` | used for | orb motion (loop) | extra | label default |
|---|---|---|---|---|
| `tap` | single taps | press (scale 1 → .82 → 1, 160 ms), ripple ring 0 → 1.7× fading; period 1.2 s; chevron bobbing 10 px above, pointing at target | — | `TAP` |
| `taps` | rapid ×N on one target | as tap, but 3 quick presses (120 ms apart) then 700 ms rest | badge `×N` | `TAP ×N` |
| `hold` | press-and-hold | press in, then SVG ring fills over `ms` (capped at 3 s visual), release, 500 ms rest | **live hold ring**: while the user is actually pressing the target, the overlay draws a ring around the pointer that fills over `ms`. This gives hold feedback to the many legacy hold games that have none | `HOLD` |
| `holdRelease` | hold, then release in a window | as hold, but the ring has a green arc segment (window) and the orb releases inside it | label flips `HOLD…` → `LET GO!` while the ring is in the green | `HOLD · LET GO ON GREEN` |
| `drag` | move along a direction past a threshold | press (scale .86), travel along vector `dir × d` in 700 ms (ease-in-out), release + fade, 450 ms rest; dashed trail draws ahead of the orb | `d` = threshold × 1.3 (×.75 under 560 px); clamped inside the stage but never below the threshold | `DRAG →` |
| `dragTo` | drop onto a zone | curved quadratic path from target to drop-zone centre (control point lifted 25 % of the distance) | the drop zone gets a pulsing dashed outline + `DROP HERE` micro-tag | `DRAG INTO …` |
| `drag` + `dir:"out"` | push away from the centre | vector = (target − stage centre), normalised × d; **computed per target** | — | `PUSH OUT` |
| `drag` + `dir:"in"` | push toward the centre | vector = (stage centre − target) | — | `PUSH IN` |
| `swipe` | fast fling | like drag but 340 ms, with 3 ghost copies trailing (motion streak) | — | `SWIPE →` |
| `sling` | pull back and release | orb pulls back along `dir` with 2 elastic band lines from the anchor; on release a dotted arc flies the *opposite* way | — | `PULL BACK · LET GO` |
| `scrub` | rub / erase / scratch | zig-zag ±40 px × 3 over the target in 900 ms | — | `RUB IT` |
| `choose` | pick one of N | each option gets a soft outline pulse in turn (380 ms each); one bouncing chevron above the group's bounding box | — | `PICK ONE` |
| `seq` | ordered taps (the selector already resolves the live one) | as tap + number badge (1, 2, 3…) counted by the overlay | — | `TAP THE GLOWING ONE` |
| `timing` | tap only in a window / slowly | orb pulses at `bpm`, or only when `when` matches (e.g. red lamp lit) | label alternates `WAIT…` / `NOW!` | `TAP… SLOWLY` |
| `alt` | alternate between two pads | orb hops between the two targets every 700 ms | — | `LEFT · RIGHT` |
| `wait` | do not touch | no orb. A big translucent ✋ at stage centre with a countdown ring of `ms`; a touch makes the hand do a gentle shake | the breath core (§C) brightens | `HANDS OFF · BREATHE` |
| `type` | text entry | blinking caret glyph at the input's right edge | moves on once the input has ≥2 chars | `TYPE A FEW WORDS` |

Reduced motion (`prefers-reduced-motion` or the `reduced` prop):
- No travel, ripple or streak.
- The orb sits still at the target and the chevron is static at the end of the vector, with a 1.6 s opacity pulse (.6 ↔ 1).
- The hold ring is drawn full.
- The spotlight mask fades in and out with no motion.

### A.3 Lifecycle (show → hide → re-show → escalate)

```
mount (key = id-seed-revision)                         ┌──────────── stop when .globalPlayGuide.isComplete,
  │                                                    │             .tsRewardSurge.mega, or stage≠play
  ├─ first play of this game id (eos:v1:seen lacks id) → show LEVEL 2 at 450 ms
  ├─ game has its own cue (own:true)                    → no first show; idle re-show only (level ≥2)
  └─ otherwise                                          → show LEVEL 1 at 1200 ms if no touch yet
SHOWN ──pointerdown anywhere in host──► HIDDEN (150 ms fade; a hold gesture keeps the live hold ring)
HIDDEN ──progress ↑ (aria-valuenow)──► "✓" pop at last target (+ sparkle, 450 ms), stay hidden
HIDDEN ──idle: no progress ↑ for 3.5 s AND no touch for 2.0 s──► re-show on the NEXT target, level = min(3, level+1)
LEVEL 1 = orb + chevron   LEVEL 2 = + label + glow   LEVEL 3 = + spotlight mask (2.4 s, then back to level 2)
```
- After the first successful action the game id is added to `eos:v1:seen`, so experienced players only see arrows when they stall.
- Wait games (`g:"wait"`) show from the start and stay until complete.
- Every show/hide is a CSS class toggle, so there are no remounts.

### A.4 Target resolution (robust generic rule + per-game table)
Each tick (rAF; measurement throttled to every 3rd frame while visible, every 250 ms while hidden):
1. `arena = host.querySelector(".cinematicContentShell > .arena")`. If absent, retry for 1.5 s, then give up silently (`window.__eosArrowMiss.push(id)` in dev).
2. **Explicit marker first:** `arena.querySelector('[data-eos-target="1"]')`. Gesture fields come from `data-eos-g`, `data-eos-dir`, `data-eos-d`, `data-eos-n`, `data-eos-ms`, `data-eos-to`, `data-eos-label`. All new games use this, and any legacy game fixed later can adopt it.
3. **Per-id stages** `EOS_GESTURES[id]` (§A.5). The active stage is the first stage whose target resolves to a usable element and whose `until` isn't yet satisfied in the current cycle.
   - `until:"touch"`: satisfied after a pointerdown inside that stage's target. `until:{touches:n}` needs n of them.
   - `until:"filled"` (type): the input value has ≥2 chars.
   - No `until`: the stage persists.
   - `once:true`: never re-armed.
   - **Cycle reset:** when the *last* stage has `until` and becomes satisfied, and progress then increases, all non-`once` stages re-arm. This is how TUG pull→let-go×6 and DRAMA dramatic→cut×6 loop correctly.
   - `takeover:true`: if this stage's target becomes usable, it wins regardless of order. Use it for a finale button that appears late (97 X-RAY "BURN IT ALL").
4. **Fallback chain** (`map_engine_hud` §6 live winners): `.arena button:not(:disabled)`, `button.uniqControl:not(:disabled)`, `.arena [style*='touch-action: none']`, `.uniqWord`, `[class*=ToolDock]`, `.tsThoughtLabelHost`, `[class*=ToolButton]`, `[class*=ActivateBtn]`, `button.wordBubble`. Verb comes from `releaseGestureForGame(game)`, or `tap` if its arrow is blank.
5. **Usable element**:
   - Its rect is ≥ 12×12 px and intersects the stage.
   - Opacity ≥ .05 (checked up to 3 ancestors), `visibility` is visible, it isn't `:disabled` or `[aria-disabled=true]`, and it's not inside `.globalPlayGuide`, `.engineProgressHud`, `.tsShiftRewardHud` or the EOS layer.
   - **Its class doesn't match** `/\b(done|dead|gone|popped|cleared|complete|completed|used|released|isDone|isGone|burned|binned)\b/`.
   - Hit test: `document.elementFromPoint(centre)` must be the element or inside it. If not, try 4 inner points (25 %/75 %). If all fail, keep it but flag it `occluded` (logged in dev; §A.7 fixes the known ones).
6. **Which of several matches:** the one nearest the last pointer position, or the stage centre before any touch. `choose` uses all matches (up to 6).
7. **Coordinates:** relative to `.releaseStage`, divided by the Framer canvas scale `k = stageRect.width / stage.offsetWidth`.
8. **Label placement:** above the target if there's ≥ 56 px of room, else below. Clamp to `[12, W−12]`. If the label rect intersects `.globalPlayGuide`'s rect, put it on the opposite horizontal side of the target.

### A.5 `EOS_GESTURES` — all 110 ids (paste into `src/eos/40_arrows.jsx`)
Built from `map_engine_hud` Appendix A (live target counts) corrected by the runtime audits (`audit_1-3.json` `realMechanic` / `realInteraction` / `fallback`).
- Field keys: `t` = selector, `g` = gesture, `dir` = r/l/u/d/ur/ul/dr/dl/lr/ud/out/in, `d` = travel px, `n` = repeats, `ms` = hold duration, `to` = drop zone, `L` = label, `own` = the game draws its own cue.
- `// verify` marks a state class or direction that the implementer must confirm once in the harness (§I.5 test `eos_arrows.mjs` asserts arrow-on-target for every id).

```js
const EOS_GESTURES = {
  1:  [{ t: "button.popBubbleV2", g: "tap", L: "TAP TO POP" }],
  2:  [{ t: "button.uniqControl", g: "taps", n: 4, L: "TAP ×4 TO CRUSH" }],
  3:  [{ t: "button.crackToolDock", g: "tap", L: "GRAB THE HAMMER", until: "touch" }, { t: ".crackBubbleSlot", g: "taps", n: 3, L: "CRACK ×3" }],
  4:  [{ t: "button.stompToolDock", g: "tap", L: "GRAB THE BOOT", until: "touch" }, { t: ".stompBubbleSlot", g: "taps", n: 3, L: "STOMP ×3" }],
  5:  [{ t: "button.uniqControl", g: "tap", L: "SWING" }],
  6:  [{ t: "button.zapGroundButton", g: "taps", n: 3, L: "TAP ×3 TO ZAP" }],
  7:  [{ t: ".pinTool", g: "drag", dir: "r", d: 130, L: "SLIDE THE PIN →" }],
  8:  [{ t: ".meteorRock", g: "sling", dir: "dl", d: 110, L: "PULL BACK · LET GO" }],            // needs §A.7 occlusion fix
  9:  [{ t: "button.laserToolDock", g: "tap", L: "GRAB THE LASER", until: "touch" }, { t: ".laserTargetBubble", g: "taps", n: 3, L: "ZAP ×3" }],
  10: [{ t: "button.uniqControl", g: "tap", L: "TIP IT OVER" }],
  11: [{ t: "button.uniqControl", g: "holdRelease", ms: 1600, L: "HOLD · LET GO ON GREEN" }],  // window 62-88 today; see fix list
  12: [{ t: "button.uniqControl", g: "taps", n: 3, L: "TAP ×3" }],
  13: [{ t: "button.uniqControl", g: "hold", ms: 1800, L: "HOLD TO SQUASH" }],
  14: [{ t: "button.paperCorner:not(:disabled)", g: "seq", L: "TAP THE LIT CORNER" }],
  15: [{ t: "button.shredAction", g: "taps", n: 5, L: "TAP TO SHRED" }],
  16: [{ t: "button.meltToolButton", g: "tap", L: "LIGHT THE TORCH", until: "touch" }, { t: ".cartoonIceCube", g: "hold", ms: 1200, L: "HOLD ON THE ICE" }], // verify hold vs tap×3 (audit says hold)
  17: [{ t: "button.weakSpot:not(.dead)", g: "seq", L: "HIT THE WEAK SPOT" }],               // LAB until fixed (occlusion)
  18: [{ t: "button.burnGroundButton", g: "hold", ms: 3000, L: "HOLD TO BURN" }],
  19: [{ t: "button.eraseActivateBtn", g: "tap", L: "GRAB THE ERASER", until: "touch" }, { t: ".eraseWordBubble", g: "scrub", L: "RUB IT OUT" }],
  20: [{ t: ".glitchPanel button.live", g: "seq", L: "TAP THE LIT SHAPE" }],
  21: [{ t: ".binWordBubble", g: "dragTo", to: ".binMouthTarget", L: "DRAG INTO THE BIN" }],
  22: [{ t: "button.flushLever", g: "tap", L: "FLUSH IT" }],
  23: [{ t: "button.vacuumBtn", g: "tap", L: "SUCK IT UP" }],
  24: [{ t: ".slingshotWord", g: "sling", dir: "dl", d: 110, L: "PULL BACK · LET GO" }],
  25: [{ t: ".swipeCard.physical", g: "swipe", dir: "r", d: 190, L: "SWIPE IT AWAY →" }],
  26: [{ t: ".launchLever", g: "drag", dir: "d", d: 130, L: "PULL THE LEVER ↓" }],
  27: [{ t: ".weightedBlock", g: "drag", dir: "d", d: 130, L: "DROP IT ↓" }],
  28: [{ t: "button.uniqControl", g: "tap", L: "OPEN THE DRAWER", until: "touch" }, { t: ".fileCard", g: "drag", dir: "d", d: 90, L: "FILE IT ↓", until: "touch" }],
  29: [{ t: ".verticalFader", g: "drag", dir: "d", d: 150, L: "SLIDE IT DOWN ↓" }],
  30: [{ t: "button.uniqControl", g: "taps", n: 4, L: "ZOOM OUT ×4" }],
  31: [{ t: ".passengerCard", g: "dragTo", to: ".backSeat", L: "MOVE TO THE BACK SEAT" }],
  32: [{ t: "button.parkBay", g: "choose", L: "PARK IT HERE" }],
  33: [{ t: "button.balloonWeight:not(:disabled)", g: "seq", L: "SNIP THE STRING" }],         // verify live state class
  34: [{ t: ".leafWord", g: "dragTo", to: ".riverFlow", L: "SET IT ON THE RIVER" }],
  35: [{ t: "button.uniqControl", g: "tap", L: "LET IT PASS" }],
  36: [{ t: ".neonCloud", g: "drag", dir: "r", d: 170, slow: true, L: "DRAG… SLOWLY →" }],    // slow: travel 1.4 s + tempo tick marks
  37: [{ t: ".floorStack button:not(:disabled)", g: "seq", L: "DOWN ONE FLOOR" }],
  38: [{ t: "button.uniqControl", g: "tap", L: "OPEN", until: "touch" }, { t: ".drawerCard", g: "drag", dir: "d", d: 90, L: "DROP IT IN ↓", until: "touch" }, { t: "button.uniqControl", g: "tap", L: "CLOSE IT", until: "touch" }],
  39: [{ t: "button.uniqControl", g: "hold", ms: 1600, L: "HOLD STILL" }],
  40: [{ t: "button.uniqControl", g: "taps", n: 2, L: "FOLD ×2", until: { touches: 2 } }, { t: ".paperPlane", g: "swipe", dir: "r", d: 170, L: "THROW IT →", until: "touch" }],
  41: [{ t: ".unhookWordBubble", g: "taps", n: 3, L: "TAP ×3 TO UNHOOK" }],
  42: [{ t: ".knot", g: "drag", dir: "ur", d: 90, L: "PULL THE KNOT" }],                       // LAB until any-order fix
  43: [{ t: "button.cutLoopScissorPicker", g: "tap", L: "GRAB THE SCISSORS", until: "touch" }, { t: ".cutLoopWordSlot", g: "taps", n: 3, L: "SNIP ×3" }],
  44: [{ t: ".velcroPatch", g: "drag", dir: "r", d: 170, slow: true, L: "PEEL IT SLOWLY →" }],
  45: [{ t: ".attentionOrb", g: "drag", dir: "r", d: 200, L: "PULL IT AWAY →" }],
  46: [{ t: ".pushPin", g: "drag", dir: "u", d: 110, L: "PULL STRAIGHT UP ↑" }],
  47: [{ t: ".plug", g: "drag", dir: "r", d: 150, L: "UNPLUG IT →" }],
  48: [{ t: ".peelCorner, .stickerWord, .glassPane", g: "drag", dir: "ur", d: 120, L: "PEEL IT ↗" }],
  49: [{ t: ".zipperPull", g: "drag", dir: "r", d: 180, L: "UNZIP →" }],
  50: [{ t: ".chainLink input", g: "type", L: "TYPE A FEW WORDS", until: "filled" }, { t: "button.premiumBigAction", g: "tap", L: "SHOW ME" }],
  51: [{ t: ".orbitButtons button.live", g: "seq", L: "TAP THE LIT VIEW" }],
  52: [{ t: ".genreKeys button", g: "choose", L: "PICK A GENRE" }],
  53: [{ t: "button.uniqControl", g: "taps", n: 4, L: "TAP ×4 · MAKE IT SILLY" }],
  54: [{ t: "button.fontDial", g: "taps", n: 4, L: "TURN THE DIAL ×4" }],
  55: [{ t: ".productionStrip button:not(:disabled)", g: "seq", L: "TURN THE DRAMA DOWN" }],
  56: [{ t: ".courtTargets button", g: "choose", L: "GIVE A VERDICT" }],
  57: [{ t: "button.uniqControl", g: "taps", n: 3, L: "ROTATE ×3" }],
  58: [{ t: "button.focusKnob", g: "taps", n: 4, L: "FOCUS ×4" }],
  59: [{ t: ".spotLamp", g: "drag", dir: "lr", d: 150, L: "MOVE THE LIGHT" }],                  // needs §A.7 occlusion fix
  60: [{ t: "button.cropHandle:not(:disabled)", g: "seq", L: "TAP THE CORNER" }],
  61: [{ t: "button.freezeWordCube", g: "taps", n: 3, L: "TAP ×3 TO FREEZE" }],
  62: [{ t: "button.catchNet", g: "tap", L: "CATCH IT" }],
  63: [{ t: ".portalRing button.hot", g: "seq", L: "TAP THE GLOW" }],
  64: [{ t: "button.uniqControl", g: "timing", when: ".trafficLamp.p0.on, .trafficLamp.p0.active, .trafficLamp.p0.lit", L: "WAIT FOR RED…" }], // verify lit class
  65: [{ t: "button.uniqControl", g: "hold", ms: 2400, L: "HOLD TO PAUSE" }],
  66: [{ g: "wait", ms: 3000, L: "HANDS OFF · BREATHE" }],
  67: [{ t: ".tapOutPads button", g: "alt", L: "LEFT · RIGHT · LEFT…" }],
  68: [{ t: ".drumKit button", g: "taps", n: 10, L: "DRUM ANY PAD" }],
  69: [{ t: "button.uniqControl", g: "timing", bpm: 40, L: "TAP… SLOWLY" }],
  70: [{ t: "button.uniqControl", g: "timing", bpm: 48, L: "EVERY 2ND BEAT" }],
  71: [{ t: ".defuseZone.active button", g: "seq", L: "TAP THE LIT STEP" }],
  72: [{ t: "button.uniqControl", g: "tap", L: "CATCH IT", until: "touch" }, { t: ".labelButtons button", g: "choose", L: "NAME IT", until: "touch" }],
  73: [{ t: ".signalConsole button.light", g: "choose", L: "PICK A LIGHT" }],
  74: [{ t: ".bubbleWrapSheet button:not(:disabled)", g: "seq", L: "POP THE NEXT ONE" }],
  75: [{ t: ".inkDrop", g: "drag", dir: "r", d: 180, L: "DRAG THE DROP →" }],
  76: [{ t: "button.uniqControl", g: "taps", n: 4, L: "REWIND ×4" }],
  77: [{ t: ".brakeHandle", g: "drag", dir: "d", d: 160, L: "PULL THE BRAKE ↓" }],
  78: [{ t: ".oneWordField button", g: "choose", L: "PICK ONE WORD" }],
  79: [{ t: ".missPads button:not(.target)", g: "tap", L: "MISS ON PURPOSE" }],
  80: [{ g: "wait", ms: 5000, L: "DON'T TAP · BREATHE" }],
  81: [{ t: ".blockTray button", g: "tap", L: "STACK IT" }],
  82: [{ t: ".nudgeRow button", g: "choose", L: "NUDGE IT" }],
  83: [{ t: ".chuteRow button", g: "choose", L: "PICK A CHUTE" }],
  84: [{ t: ".ownershipCard", g: "swipe", dir: "lr", d: 150, L: "← MINE · NOT MINE →" }],     // verify side mapping
  85: [{ t: ".controlPanelSwitches button", g: "choose", L: "PICK ONE MOVE" }],
  86: [{ t: ".rubberStamps button", g: "choose", L: "STAMP IT" }],
  87: [{ t: ".keepDropCard", g: "drag", dir: "d", d: 140, L: "DROP IT ↓", own: true }],
  88: [{ t: "button.coinSlot", g: "tap", L: "INSERT A COIN", until: "touch" }, { t: ".tradeOptions button", g: "choose", L: "PICK A PRIZE", until: "touch" }],
  89: [{ t: "button.doorABFrame.door-a", g: "tap", L: "OPEN DOOR A", until: "touch", once: true }, { t: "button.doorABFrame.door-b", g: "tap", L: "NOW DOOR B" }],
  90: [{ t: "button.coin.realFlipCoin", g: "tap", L: "FLIP IT" }],
  91: [{ t: ".priorityBubbleTray button", g: "drag", dir: "u", d: 120, L: "DRAG INTO A SLOT" }], // verify drop slots
  92: [{ t: ".intensityRuler button", g: "choose", L: "TAP A NUMBER" }],
  93: [{ t: ".spaceTile", g: "drag", dir: "out", d: 90, L: "PUSH IT OUT", own: true }],
  94: [{ t: ".juggleBall", g: "choose", L: "KEEP ONE", until: "touch", once: true }, { t: ".juggleBall", g: "taps", n: 3, L: "TAP ×3" }],
  95: [{ t: ".shelfThoughtBubble", g: "drag", dir: "u", d: 120, L: "LIFT IT ONTO THE SHELF", own: true }],
  96: [{ t: "button.scratchToolButton", g: "tap", L: "GRAB THE SCRATCHER", until: "touch", once: true }, { t: ".scratchPlayArea", g: "scrub", L: "SCRATCH" }],
  97: [{ t: "button.xrayScannerHandle", g: "drag", dir: "r", d: 180, L: "SCAN IT →", own: true }, { t: "button.xrayBurnAllButton", g: "tap", L: "BURN IT ALL", takeover: true }],
  98: [{ t: "button.magicTrapBubble", g: "choose", L: "PICK ONE", until: "touch", once: true }, { t: "button.magicLeverHandle", g: "drag", dir: "d", d: 90, L: "PULL THE LEVER ↓", own: true }],
  99: [{ t: "button.echoHoldBubble:not(.gone)", g: "hold", ms: 5000, L: "HOLD TO QUIET IT" }],
  100: [{ t: "button.thoughtPotato", g: "drag", dir: "out", d: 90, L: "TOSS IT AWAY", own: true }],
  101: [{ t: "button.tugPullHandle", g: "drag", dir: "l", d: 70, L: "PULL ←", own: true, until: "touch" }, { t: "button.tugLetGo", g: "tap", L: "NOW LET GO", until: "touch" }],
  102: [{ t: ".ftRow", g: "drag", dir: "in", d: 110, L: "PUSH IN · DON'T PULL", own: true }],
  103: [{ t: "button.spDropButton", g: "tap", L: "LOWER IT" }],
  104: [{ t: ".knobHitZone", g: "drag", dir: "d", d: 90, L: "TURN IT DOWN ↓" }],
  105: [{ t: "button.dmDramaButton", g: "tap", L: "MAKE IT DRAMATIC", until: "touch" }, { t: "button.dmCutButton", g: "tap", L: "CUT!", until: "touch" }],
  106: [{ t: ".tsndVibes button", g: "choose", L: "PICK A VIBE", until: "touch", once: true }, { t: "button.tsndKey:not(:disabled)", g: "taps", n: 3, L: "PLAY ×3" }],
  107: [{ t: "button.gwProp", g: "choose", L: "PICK A PROP", until: "touch" }, { t: ".gwCard.weirdWordBubble", g: "tap", L: "STICK IT ON", until: "touch" }],
  108: [{ t: "button.uniqControl", g: "tap", L: "SHAKE IT", until: "touch", once: true }, { t: ".saladBowl button", g: "tap", L: "TAP TO SWAP" }],
  109: [{ t: "button.cleanseBubbleHoldButton.active, button.cleanseBubbleHoldButton:not(:disabled)", g: "hold", ms: 900, L: "HOLD TO RINSE" }],
  110: [{ t: ".rainCloudUnit", g: "drag", dir: "d", d: 110, L: "PULL IT DOWN ↓", own: true }],
}
// new games 111-120 mark targets with data-eos-* attributes; no table entry needed.
```
`EosGestureFor(game)` returns `{ stages: EOS_GESTURES[id] || [inferred], glyph }`. Glyphs for the guide panel:
- tap / taps / seq / timing: `◎`
- hold / holdRelease: `◉`
- drag: the direction arrow (`→ ← ↑ ↓ ↗ ↘ ↙ ↖`); `out` is `⤢`, `in` is `⤡`, `lr` is `↔`
- swipe: `⇢`
- sling: `↶`
- scrub: `≋`
- choose: `☰`
- alt: `⇄`
- wait: `✋`
- type: `✎`

### A.6 Guide-panel arrow + wrong-instruction fixes (cheap, high value)
- Light the panel arrow for **both** wrappers (edit E13, §I.3), using `EosGestureFor(p.game).glyph`. Give ids ≥100 the missing CSS: `${EOS_A} .globalPlayGuide .guideActionArrow{…}`, the same look as the legacy L28 rule, with `font-size:22px`.
- **Fix the 25 contradicting guide lines with zero arcade edits:** `SHORT_HINT` is a `const` object with priority in `shortHint()` (L2186), so `30_router.jsx` does `Object.assign(SHORT_HINT, EOS_HINT_FIX)`:

```js
const EOS_HINT_FIX = {
  3: "Grab the hammer, then tap each egg 3×",      4: "Grab the boot, then stomp each bubble 3×",
  5: "Tap to swing",                               6: "Tap the zapper 3×",
  9: "Grab the laser, then tap each bubble 3×",    14: "Tap the glowing corner",
  16: "Light the torch, then hold on each ice cube", 19: "Grab the eraser, then rub each word",
  30: "Tap zoom-out 4×",                           51: "Tap the glowing view",
  53: "Tap 4× to make it silly",                   55: "Tap each glowing switch to turn the drama down",
  56: "Tap a verdict",                             60: "Tap the glowing corner",
  61: "Tap each word 3× to freeze it",             63: "Tap the glowing portal",
  67: "Tap left, then right",                      74: "Pop the glowing bubble",
  76: "Tap rewind 4×",                             85: "Pick one move you can make",
  90: "Tap the coin to flip it",                   92: "Tap how big it feels",
  96: "Grab the scratcher, then scratch",          99: "Hold each bubble until it goes quiet",
  101: "Pull left, then let go — 6 times",
}
```
Also compress the panel once the arrow is doing the teaching: after the first progress step, the guide panel collapses to a single pill (`glyph + action`, 15 px), and expands again only on idle level ≥2. CSS: `.globalPlayGuide.isActive:not(.eosIdle) .globalMindBend{display:none}`, where the overlay toggles `eosIdle` on the host root via `classList`, not React.

### A.7 Occlusion / affordance fixes that arrows expose (CSS only, in `EOS_CSS_FIXES`)
```css
${EOS_A} .orbitArc{pointer-events:none!important}                                   /* 8 METEOR: rock is covered at all 25 sample points */
${EOS_A} .arena.uniqArena .uniqWord.hasDirectThoughtImage{pointer-events:none!important} /* 17 BOSS w0/w2, 42 UNTANGLE k2, 59 SPOTLIGHT lamp centre */
${EOS_A} .arena .stickerWord{min-width:120px!important;min-height:64px!important}     /* 48 UNSTICK collapses to 3×10 px */
${EOS_A} .arena :is(.crackToolDock,.stompToolDock,.laserToolDock,.meltToolButton,.eraseActivateBtn,.cutLoopScissorPicker,.scratchToolButton){animation:eosArmPulse 1.4s ease-in-out infinite}
${EOS_A} .arena :is(.crackToolDock,.stompToolDock,.laserToolDock,.meltToolButton,.eraseActivateBtn,.cutLoopScissorPicker,.scratchToolButton):is(.selected,.active,[aria-pressed=true]){animation:none}
${EOS_A} .arena :is(.paperCorner,.cropHandle,.weakSpot,.balloonWeight,.floorStack button,.bubbleWrapSheet button,.productionStrip button,.orbitButtons button):not(:disabled):not(.dead){box-shadow:0 0 0 3px hsla(var(--eos-h,190),100%,70%,.85),0 0 18px hsla(var(--eos-h,190),100%,70%,.6)!important}
${EOS_A} .arena :is(.paperCorner,.cropHandle,.bubbleWrapSheet button,.productionStrip button,.orbitButtons button):disabled{opacity:.45!important;filter:saturate(.4)!important}
${EOS_A} .arena :is(.uniqControl,.drawerCard,.fileCard,.paperPlane)[style*="cursor: grab"]:not([data-eos-ready]){cursor:pointer!important}  /* misleading grab cursors (28, 38, 40) */
```
(The live-highlight rule removes the "hidden order" problem in 14, 33, 37, 55, 60, 74 without touching game code. For 17 BOSS, the `:not(.dead)` first-in-DOM spot is the live one; verify it.)

### A.8 Implementation sketch — `src/eos/40_arrows.jsx` (~450 lines)
Mounted by `EosStageLayer` (edit E9) as `<EosGuideArrows key={gameKey} game={game} hostRef={hostRef} reduced={reduced} />`, and only while `stage === "play"`. `gameKey` is the engine key, so it remounts exactly when the game remounts.
```jsx
function EosGuideArrows({ game, hostRef, reduced, stageRef }) {
  const spec = React.useMemo(() => EosGestureFor(game), [game.id])
  const s = React.useRef({ armed: {}, touches: {}, level: 0, shown: false, lastProg: 0, lastProgAt: 0,
                           lastTouchAt: 0, near: null, reshows: 0, cycleDone: false }).current
  const [v, setV] = React.useState(null)       // {x,y,w,h,g,dir,dx,dy,len,ang,L,n,ms,to,opts,level,badge,key}
  React.useEffect(() => {
    const host = hostRef.current, stage = host?.closest(".releaseStage"); if (!host || !stage) return
    const first = !eosSeen(game.id), t0 = performance.now(); let raf = 0, frame = 0, alive = true
    s.lastProgAt = t0
    const onDown = (e) => {                                  // capture phase: sees every touch, never blocks it
      s.lastTouchAt = performance.now(); s.near = { x: e.clientX, y: e.clientY }
      const st = s.activeStage, el = s.activeEl
      if (st && el && el.contains(e.target)) { s.touches[st.i] = (s.touches[st.i] || 0) + 1; eosMaybeSatisfy(s, st) }
      if (s.shown) { s.shown = false; setV((p) => p && { ...p, hidden: true }) }
    }
    host.addEventListener("pointerdown", onDown, true)
    const tick = (now) => {
      if (!alive) return; raf = requestAnimationFrame(tick)
      if (++frame % (s.shown ? 3 : 15)) return               // ~20 Hz when visible, 4 Hz when hidden
      if (host.querySelector(".globalPlayGuide.isComplete, .tsRewardSurge.mega")) { setV(null); return }
      const prog = +(host.querySelector(".engineProgressTrack")?.getAttribute("aria-valuenow") || 0)
      if (prog > s.lastProg) { s.lastProg = prog; s.lastProgAt = now; eosMarkSeen(game.id); eosCycleReset(s, spec); setV((p) => p && { ...p, ok: now }) }
      const arena = host.querySelector(".cinematicContentShell > .arena"); if (!arena) return
      const pick = eosResolve(arena, spec, s)               // A.4 steps 2-6 → { stage, el, els, toEl } | null
      if (!pick) return
      s.activeStage = pick.stage; s.activeEl = pick.el
      const idle = now - s.lastProgAt > 3500 && now - s.lastTouchAt > 2000
      const firstShow = !s.everShown && !pick.stage.own && now - t0 > (first ? 450 : 1200) && !s.lastTouchAt
      const isWait = pick.stage.g === "wait"
      if (!s.shown && (isWait || firstShow || idle)) {
        s.shown = true; s.everShown = true
        s.level = isWait ? 2 : firstShow ? (first ? 2 : 1) : Math.min(3, Math.max(2, s.level + 1))
        s.lastProgAt = now                                  // restart idle clock after each show
      }
      if (s.shown) setV(eosGeometry(stage, pick, s, reduced)) // A.4 step 7-8; returns same object if unchanged (cheap compare)
    }
    raf = requestAnimationFrame(tick)
    return () => { alive = false; cancelAnimationFrame(raf); host.removeEventListener("pointerdown", onDown, true) }
  }, [game.id])
  if (!v) return null
  return (
    <div className={`eosArrowLayer ${v.hidden ? "isHidden" : ""} lvl${v.level}`} aria-hidden="true">
      {v.level >= 3 ? <i className="eosSpot" style={{ "--x": v.x + "px", "--y": v.y + "px", "--r": Math.max(v.w, v.h) * .8 + 40 + "px" }} /> : null}
      <div className={`eosArrow g-${v.g}`} style={{ "--x": v.x + "px", "--y": v.y + "px", "--dx": v.dx + "px", "--dy": v.dy + "px",
            "--len": v.len + "px", "--ang": v.ang + "deg", "--ms": (v.ms || 1200) + "ms" }}>
        {v.g === "wait" ? <b className="eosHand">✋</b> : <i className="eosTouch" />}
        {v.len ? <i className="eosTrail"><i className="eosHead" /></i> : null}
        {v.n ? <b className="eosBadge">×{v.n}</b> : null}
        {/hold/.test(v.g) ? <svg className="eosRing" viewBox="0 0 60 60"><circle r="26" cx="30" cy="30" /></svg> : null}
      </div>
      {v.to ? <i className="eosDrop" style={{ "--x": v.to.x + "px", "--y": v.to.y + "px", "--w": v.to.w + "px", "--h": v.to.h + "px" }} /> : null}
      {v.opts?.map((o, i) => <i key={i} className="eosOpt" style={{ "--x": o.x + "px", "--y": o.y + "px", "--w": o.w + "px", "--h": o.h + "px", "--i": i }} />)}
      {v.level >= 2 && v.L ? <b className="eosLabel" style={{ "--lx": v.lx + "px", "--ly": v.ly + "px" }}>{v.L}</b> : null}
      {v.ok ? <b key={v.ok} className="eosOk" style={{ "--x": v.x + "px", "--y": v.y + "px" }}>✓</b> : null}
    </div>
  )
}
```
Key CSS (all in `EOS_CSS_ARROWS`; root `.eosArrowLayer{position:absolute;inset:0;pointer-events:none;z-index:60;font-family:"Baloo 2",Inter,system-ui}`):
```css
.eosArrow{position:absolute;left:var(--x);top:var(--y);width:0;height:0}
.eosTouch{position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle,#fff 0 22%,hsla(var(--eos-h,190),100%,72%,.9) 34%,transparent 70%);box-shadow:0 0 18px hsla(var(--eos-h,190),100%,70%,.85)}
.g-tap .eosTouch,.g-seq .eosTouch,.g-timing .eosTouch{animation:eosTap 1.2s cubic-bezier(.3,.7,.4,1) infinite}
.g-drag .eosTouch,.g-dragTo .eosTouch{animation:eosTravel 1.6s cubic-bezier(.45,0,.25,1) infinite}
.g-swipe .eosTouch{animation:eosTravel .9s cubic-bezier(.6,0,.2,1) infinite}
.g-sling .eosTouch{animation:eosSling 1.8s cubic-bezier(.5,0,.3,1) infinite}
.g-scrub .eosTouch{animation:eosScrub .9s ease-in-out infinite}
.eosTrail{position:absolute;left:0;top:-2px;width:var(--len);height:4px;transform-origin:0 50%;rotate:var(--ang);background:repeating-linear-gradient(90deg,#d4ffff 0 10px,transparent 10px 18px);filter:drop-shadow(0 0 6px rgba(0,229,255,.9));animation:eosDash .6s linear infinite}
.eosHead{position:absolute;right:-6px;top:-13px;width:0;height:0;border-left:22px solid #eaffff;border-top:15px solid transparent;border-bottom:15px solid transparent;filter:drop-shadow(0 0 8px rgba(0,229,255,.95))}
.eosLabel{position:absolute;left:var(--lx);top:var(--ly);padding:7px 12px;border-radius:999px;background:rgba(5,14,26,.88);border:1px solid hsla(var(--eos-h,190),100%,70%,.55);color:#fff;font:900 15px/1.05 "Baloo 2",Inter,sans-serif;letter-spacing:.06em;white-space:nowrap;box-shadow:0 6px 24px rgba(0,0,0,.45)}
.eosBadge{position:absolute;left:18px;top:-38px;min-width:30px;height:24px;padding:0 6px;border-radius:12px;background:#fff;color:#08131f;font:1000 14px/24px "Baloo 2",sans-serif;text-align:center}
.eosRing{position:absolute;left:-34px;top:-34px;width:68px;height:68px;rotate:-90deg}
.eosRing circle{fill:none;stroke:#fff;stroke-width:4;stroke-dasharray:164;stroke-dashoffset:164;animation:eosRingFill var(--ms) linear infinite}
.eosSpot{position:absolute;inset:0;background:radial-gradient(circle at var(--x) var(--y),transparent 0 var(--r),rgba(0,4,10,.62) calc(var(--r) + 40px));animation:eosSpotIn 2.4s ease forwards}
.eosArrowLayer.isHidden>*{opacity:0;transition:opacity .15s}
@keyframes eosTap{0%,100%{scale:1;opacity:.95}18%{scale:.8}40%{scale:1.05}}
@keyframes eosTravel{0%{translate:0 0;scale:1;opacity:0}12%{opacity:1;scale:.86}70%{translate:var(--dx) var(--dy);scale:.86;opacity:1}86%,100%{translate:var(--dx) var(--dy);opacity:0}}
@keyframes eosSling{0%{translate:0 0;opacity:0}15%{opacity:1}55%{translate:var(--dx) var(--dy);scale:.8}62%{translate:0 0;scale:1.15}100%{translate:calc(var(--dx) * -2.2) calc(var(--dy) * -2.2);opacity:0}}
@keyframes eosScrub{0%,100%{translate:-40px 0}25%,75%{translate:40px 0}50%{translate:-40px 0}}
@keyframes eosDash{to{background-position:18px 0}}
@keyframes eosRingFill{0%{stroke-dashoffset:164}85%,100%{stroke-dashoffset:0}}
@media (max-width:560px){.eosLabel{font-size:14px;padding:6px 10px}.eosTouch{left:-22px;top:-22px;width:44px;height:44px}}
@media (prefers-reduced-motion:reduce){.eosArrowLayer *{animation:eosStill 1.6s ease-in-out infinite!important;translate:none!important}@keyframes eosStill{50%{opacity:.6}}}
```
The **live hold ring** is a separate tiny element (`.eosHoldLive`) positioned at the pointer. It appears on `pointerdown` inside a `hold`/`holdRelease` stage target and fills over `ms`; on `pointerup` it fades. This is visible feedback for 11, 13, 18, 39, 65, 99 and 109.

---------------------------------------------------------------------------------------------------
## B. Typography and HUD readability

### B.1 Type scale (tokens on `.tsArcade`)
| token | desktop | phone ≤560 | use |
|---|---|---|---|
| `--eos-fs-xs` | 12px | 12px | the absolute floor: micro caps labels (letter-spacing ≤ .08em) |
| `--eos-fs-sm` | 13px | 12px | secondary labels, counters inside arenas |
| `--eos-fs-md` | 15px | 14px | instructions, buttons, arrow labels |
| `--eos-fs-num` | 17px | 15px | HUD numbers (⚡, %, LVL), tabular-nums |
| `--eos-fs-word` | clamp(16px, 1.35vw, 20px) | 15px | **the user's own words** on any object |
| `--eos-fs-hero` | clamp(30px, 4vw, 48px) | 30px | shift-meter numbers, check-in title |
Weight 800-900 (Baloo 2). Contrast ≥ 4.5:1 on glass (white `#fff` or `#eaffff` text on `rgba(5,14,26,.85)`). Tap targets ≥ 44 × 44 px.

### B.2 Element → minimum size (today measured 1280 / 390 → target)
| element (selector) | today | target desktop / phone |
|---|---|---|
| header level `.releaseScoreBar span` | 12 / 10 | 14 / hidden ≤560 (the level moves into the `EosHeaderChips` ring so the header doesn't clip) |
| header score `.releaseScoreBar strong` | 12 / 10 | **17 / 15**, tabular-nums; box `height:36px; min-width:200px` (32 / 168 on phone) |
| progress text `.engineProgressText` | 10 / 9 | 13 / 12 (visually replaced by `EosPlayHud`, §B.3) |
| spark/token/chain pills `.tsShiftRewardPill` | **8.3 / 6.5** | replaced by `EosPlayHud`; if kept: 13 / 12, height 28 |
| shift level `.tsShiftLevel>b` | **7 / 6.2** | replaced; if kept: 13 / 12 |
| guide header `.guideHeaderRow b` | 12.5 / 10.2 | 13 / 12 |
| guide label `.guideStepCard small` ("How to play") | 10 / 8.7 | 12 / 12 |
| **guide instruction** `.guideStepCard span` | 12.4 / 9.8 | **16 / 15**, weight 900 (largest text in the panel) |
| mind-bend label `.globalMindBend strong` | 9.8 / 8.5 | 12 / 12 |
| mind-bend text `.globalMindBend em` | 11.8 / 9.3 | 14 / 13 |
| user words `.tsExactUserText, .plainUserThoughtText, .tsExternalThoughtLabel, .potatoWord, .echoBubbleWord, .spaceTileWord, .coinReleaseWord, .exactWordsWithImage b` | 9-11 / 8.2 (**99: 3.9**) | **16-20 / 15**, `line-height:1.05`, max 2 lines |
| in-arena counters/status `.literalProgress, .toolHitCount, .miniCrackCount, .freezeWordCube>b, .premiumCombo, .combo, .literalStatus :is(b,span), .uniqStatus :is(b,span), .cleanseStatus, .defuseZone small, .cutLoopWord>em, .unhookWordBubble>small, .binWordBubble>b, .eraseWordBubble>b, .shredderMouth>b` | 5.6-11 | 13 / 12 |
| arena buttons `.uniqControl, .parkBay, .orbitButtons button, .genreKeys button, .productionStrip button, .nudgeRow button, .cleanseBubbleHoldButton, .eraseActivateBtn, .cutLoopScissorPicker, [class*=ToolDock], .dmDramaButton, .dmCutButton, .gwProp, .tsndVibes button` | 7-10 | 14 / 13; min-height 44 |
| 100-110 micro labels `.tsndKeySub, .tsndNoteBadge, .tsndAction, .dmControlCopy, .dmProgressText, .doorABIdlePrompt, .ftRule, .ftArrow em, .ftCue, [class*=magic][class*=Label], .xrayPassLabel, .tugPullHandle, .hotPotatoGuide` | 5-8.3 | 12 / 12 |
| step payout `.tsRewardPayout` / finish `.tsFinishRewardPayout` | 11.3 / 10 | 14 / 13 |
| composer `.choiceCopy`, `.choiceArrow`; header `.releaseTitleBy`, `.releaseTitleBrand` | 7-9 | 13 / 12 (title by-line hidden ≤560 so the header never clips) |
**Hard rule, enforced by test `dev/eos_type.mjs`:** across `.tsArcade`, no visible text node renders under 12 px (rendered px = computed × ancestor scale), and user words render at ≥15 px, at both 1280×860 and 390×844, for all 110 + 10 games.

### B.3 `EosPlayHud` — one readable relief meter for all 120 games (replaces the 8.3 px pills)
Today ids <100 show only "GAME PROGRESS · N%" (10 px), and ids ≥100 show a 10 px bar plus three 8.3 px pills that **overflow off-screen at 390 px** (`map_engine_hud` §3.3). Replace the *visual* with one EOS component. The original DOM stays in place, so `aria-valuenow` and the audits keep working:
```
┌─[RUSH face]──── COOL-DOWN ▓▓▓▓▓▓▓░░░░ 62% ────[STILL face]─┐   ⚡ +36     (desktop: top-right 460px wide)
└────────────────────────────────────────────────────────────┘             (phone: full-width row under header)
```
- Left: the emotion character with its **negative** expression. Right: the **positive** one, cross-fading at 0/50/100 %. The fill is a gradient from `hsl(--eos-h)` to calm cyan `#7df1ff`. The label is the emotion's meter word (§D.1): `COOL-DOWN 62%`, 14 px / num 17 px.
- `⚡ +N` round counter (17 px num): +8…+18 per progress step (`8 + min(10, 2·(chain−1))`, the same curve GameEngine uses), with a floater `+12` rising from the last touch point (Supercell coin pop). On finish the round sparks **pour** into the header ⚡ (12 particles, 600 ms) and are added to the score through `EosRoundBonus()` in `done()` (edit E7b), so the number you watched is the number you keep. **One currency (⚡); tokens and chain go away** (redundant with Memory Orbs and the combo floaters).
- Reads progress from `.engineProgressTrack[aria-valuenow]` (both wrappers). It never writes to the engines.
- Hidden via CSS: `${EOS_A}.stage-play .releaseGameHost :is(.engineProgressHud,.tsShiftRewardHud){opacity:0!important;pointer-events:none!important}`. Still in the DOM, so this also removes the overflow bug.
- Fallback if `EosPlayHud` is deferred: the CSS-only block in §B.4 makes the existing HUD readable and stacks it in a column.

### B.4 CSS block (`EOS_CSS_TYPE`, mounted via `<EosGlobalStyle/>`, edit E10)
`EOS_A = ".tsArcade:not(#eosA):not(#eosB):not(#eosC)"`. That's 3 IDs, which beats both arcade `!important` rules and the Pixar `PX_B` (2 IDs) regardless of `<style>` order, and works with or without the Pixar wrapper.
```css
${EOS_A}{--eos-fs-xs:12px;--eos-fs-sm:13px;--eos-fs-md:15px;--eos-fs-num:17px;--eos-fs-word:clamp(16px,1.35vw,20px)}
@media (max-width:560px){${EOS_A}{--eos-fs-sm:12px;--eos-fs-md:14px;--eos-fs-num:15px;--eos-fs-word:15px}}
/* header */
${EOS_A} .releaseScoreBar{height:36px!important;min-width:200px!important;gap:8px!important}
${EOS_A} .releaseScoreBar span{font:800 14px/1 "Baloo 2",Inter,sans-serif!important}
@media (max-width:560px){${EOS_A} .releaseScoreBar span{display:none!important}${EOS_A} .releaseScoreBar{min-width:132px!important;height:32px!important}${EOS_A} :is(.releaseTitleBy,.releaseTitleBrand){display:none!important}}
${EOS_A} .releaseScoreBar strong{font:900 var(--eos-fs-num)/1 "Baloo 2",Inter,sans-serif!important;font-variant-numeric:tabular-nums!important}
${EOS_A} :is(.releaseTitleBy,.releaseTitleBrand,.choiceCopy,.choiceArrow){font-size:max(var(--eos-fs-xs),1em)!important}
/* in-game HUD (fallback when EosPlayHud is off) */
${EOS_A}.stage-play .releaseGameHost .engineProgressHud{flex-direction:column!important;height:auto!important;gap:6px!important;align-items:stretch!important}
${EOS_A}.stage-play .releaseGameHost .engineProgressTrack{height:24px!important;min-height:24px!important;width:100%!important}
${EOS_A}.stage-play .releaseGameHost .engineProgressText{font:900 var(--eos-fs-sm)/1 "Baloo 2",Inter,sans-serif!important;letter-spacing:.05em!important}
${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel>b){font:900 var(--eos-fs-sm)/1 "Baloo 2",Inter,sans-serif!important}
${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel){height:28px!important;padding:0 10px!important}
/* live guide */
${EOS_A} .globalPlayGuide .guideHeaderRow b{font-size:var(--eos-fs-sm)!important}
${EOS_A} .globalPlayGuide :is(.guideStepCard small,.globalMindBend strong){font-size:var(--eos-fs-xs)!important;letter-spacing:.06em!important}
${EOS_A} .globalPlayGuide .guideStepCard span{font:900 calc(var(--eos-fs-md) + 1px)/1.2 "Baloo 2",Inter,sans-serif!important}
${EOS_A} .globalPlayGuide .globalMindBend em{font-size:calc(var(--eos-fs-sm) + 1px)!important;line-height:1.25!important}
/* user's words: readable floor; the Framer "Bubble Text" prop now acts as a boost above the floor */
${EOS_A}.stage-play :is(.tsExactUserText,.plainUserThoughtText,.tsExternalThoughtLabel,.potatoWord,.echoBubbleWord,.spaceTileWord,.coinReleaseWord,.exactWordsWithImage b){font-size:max(var(--eos-fs-word),var(--bubble-text-size,0px))!important;line-height:1.05!important;overflow-wrap:anywhere!important}
/* arena counters / labels / buttons */
${EOS_A}.stage-play .arena :is(.literalProgress,.toolHitCount,.miniCrackCount,.freezeWordCube>b,.premiumCombo,.combo,.literalStatus b,.literalStatus span,.uniqStatus b,.uniqStatus span,.cleanseStatus,.defuseZone small,.cutLoopWord>em,.unhookWordBubble>small,.binWordBubble>b,.eraseWordBubble>b,.shredderMouth>b,.tsndKeySub,.tsndNoteBadge,.tsndAction,.dmControlCopy,.dmProgressText,.doorABIdlePrompt,.ftRule,.ftArrow em,.ftCue,.hotPotatoGuide,.tsRewardPayout,.tsFinishRewardPayout){font-size:max(var(--eos-fs-sm),1em)!important;letter-spacing:.06em!important}
${EOS_A}.stage-play .arena :is(.uniqControl,.parkBay,.orbitButtons button,.genreKeys button,.productionStrip button,.nudgeRow button,.cleanseBubbleHoldButton,.eraseActivateBtn,.cutLoopScissorPicker,[class*=ToolDock],.dmDramaButton,.dmCutButton,.gwProp,.tsndVibes button){font-size:max(var(--eos-fs-md),1em)!important;min-height:44px!important}
${EOS_A}.stage-play .arena [class*="magic"] :is(small,b,em,span):not(.tsExactUserText){font-size:max(var(--eos-fs-xs),1em)!important}
```
`max(token, 1em)` keeps anything that is already bigger and lifts only the tiny ones. **Overflow guard:** `dev/eos_type.mjs` also flags `scrollWidth > clientWidth + 2` on every resized node. The likely offenders are 92 px bubbles with 3-word chunks; there, `displayText(w, 18)` already caps the length, and the CSS allows 2 lines.

### B.5 Two code edits that CSS cannot reach
- **E15:** 99 ECHO forces `font-size:${engineBubbleTextPx}px !important` inline (L18222), and inline `!important` beats any stylesheet. Change the floor in `engineBubbleTextPx` from `1` to `15` (2 identical anchors, `replace_all`).
- **E16 (optional):** `bubbleTextPx = 4` default → `16` (main L21026, and the property control default + `max: 28`). The CSS already makes the prop a boost, so this only matters for the 2 engines that read it in code.
- Do **not** "fix" `dynamicBubbleTextCss` (L21047). With the default 4 px it would *shrink* every word if it started matching. Leave it dead.

---------------------------------------------------------------------------------------------------
## C. Background dots converge into the centre ("everything comes home")

### C.1 Behaviour
- **Which dots:**
  - **All three visible dot layers converge:** Pixar motes `.tsPxDust` (14, over the whole component), per-game `.cinemaDust i` (14 inside every arena), and a new **`EosDotField`** (24 dots, 12 on phone) inside `.releaseStage`, behind the game.
  - The existing `InfinityField` is retired with `display:none`. It is invisible today: `--flow-hue` is undefined, and it sits at z 0 under the opaque `.releaseStage` background.
- **Path:** each dot spawns at a random point on a ring 35-60 % from the centre, fades in, and **spirals** (not straight) into the centre over 8-17 s. It brightens as it nears, then shrinks to 10 % and vanishes into the core, while new dots keep spawning (negative delays mean the field is always full).
- **The curve is free:** `left` and `top` animate with *different* easing curves, and odd/even dots swap the curves, so half spiral clockwise and half counter-clockwise.
- **Core:**
  - `EosCore` is a 120 px soft glow at the stage centre. It **breathes at 6/min** (scale .7 → 1.15 over 4 s, back over 6 s), a subliminal paced-breathing cue that matches the panic science.
  - **Colour:** the core starts at the checked-in emotion's hue and moves to calm cyan (`190`) as game progress rises.
  - **Brightness:** it gets brighter with progress (opacity .35 → .75).
- **Stage choreography:**
  - **Input/check-in:** dots converge into the existing abyss core (`.ts-abyss-core` is already at the centre).
  - **Play:** dots converge behind the game at opacity .35 so they never compete with targets.
  - **Finish:** when the `onDone` burst appears, the core **blooms** (scale 2.6, 600 ms) and becomes the Memory Orb that flies into the reveal card.
  - **Reveal:** dots burst outward once (reverse keyframe, 900 ms), then converge again.

### C.2 Implementation (CSS-first; JSX only for `EosDotField`/`EosCore`)
Animating `left`/`top` toward `50%` needs no per-dot JS, because the inline `left/top` is the start value. That's 52 dots of local layout in total, negligible cost.
```css
@keyframes eosMergeX{to{left:var(--eos-cx,50%)}}
@keyframes eosMergeY{to{top:var(--eos-cy,50%)}}
@keyframes eosMergeFade{0%{opacity:0;scale:.6}12%{opacity:.85}78%{opacity:.95;scale:1}92%{opacity:.6;scale:.35}100%{opacity:0;scale:.1}}
/* Pixar motes (99_pixar markup keeps --d / --dl) */
.tsPixarRoot:not(#eosA):not(#eosB) .tsPxRig{--eos-cy:46%}          /* rig covers header+composer → aim at stage centre */
.tsPixarRoot:not(#eosA):not(#eosB) .tsPxDust{animation:eosMergeX var(--d,11s) cubic-bezier(.55,.05,.7,.35) var(--dl,0s) infinite,eosMergeY var(--d,11s) cubic-bezier(.2,.6,.35,1) var(--dl,0s) infinite,eosMergeFade var(--d,11s) linear var(--dl,0s) infinite!important}
.tsPixarRoot:not(#eosA):not(#eosB) .tsPxDust:nth-of-type(odd){animation-timing-function:cubic-bezier(.2,.6,.35,1),cubic-bezier(.55,.05,.7,.35),linear!important}
/* per-game cinema dust: keep inline durations, add per-dot phase via --d (index) */
${EOS_A}.stage-play .cinemaDust i{animation-name:eosMergeX,eosMergeY,eosMergeFade!important;animation-timing-function:cubic-bezier(.55,.05,.7,.35),cubic-bezier(.2,.6,.35,1),linear!important;animation-iteration-count:infinite!important;animation-delay:calc(var(--d) * -.7s)!important;opacity:1!important}
${EOS_A}.stage-play .cinemaDust i:nth-child(odd){animation-timing-function:cubic-bezier(.2,.6,.35,1),cubic-bezier(.55,.05,.7,.35),linear!important}
/* retire the invisible legacy field */
${EOS_A} .infinityField{display:none!important}
/* EOS field + core (rendered by EosStageLayer inside .releaseStage, z-index 1 = behind .releaseGameHost z 2) */
.eosDotField{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden;--eos-cx:50%;--eos-cy:50%}
.eosDotField i{position:absolute;width:var(--s);height:var(--s);border-radius:50%;background:radial-gradient(circle,#fff 0 20%,hsla(var(--eos-h,190),100%,72%,.9) 34%,transparent 72%);box-shadow:0 0 10px hsla(var(--eos-h,190),100%,70%,.6);animation:eosMergeX var(--t) cubic-bezier(.55,.05,.7,.35) var(--dl) infinite,eosMergeY var(--t) cubic-bezier(.2,.6,.35,1) var(--dl) infinite,eosMergeFade var(--t) linear var(--dl) infinite}
.eosDotField i:nth-child(odd){animation-timing-function:cubic-bezier(.2,.6,.35,1),cubic-bezier(.55,.05,.7,.35),linear}
.tsArcade.stage-play .eosDotField{opacity:.35}
.eosCore{position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;pointer-events:none;z-index:1;mix-blend-mode:screen;background:radial-gradient(circle,rgba(255,255,255,.6) 0 6%,hsla(var(--eos-h,190),100%,70%,var(--eos-core-a,.38)) 24%,transparent 68%);animation:eosBreath 10s cubic-bezier(.45,0,.55,1) infinite}
@keyframes eosBreath{0%,100%{scale:.7}40%{scale:1.15}}          /* 4 s in, 6 s out = 6 breaths/min */
.eosCore.isBloom{animation:eosBloom .6s cubic-bezier(.2,.9,.3,1.3) forwards}
@keyframes eosBloom{to{scale:2.6;opacity:1}}
@keyframes eosFieldBurst{from{scale:.15;opacity:1}to{scale:1}}
.tsArcade.stage-reveal .eosDotField{animation:eosFieldBurst .9s cubic-bezier(.2,.9,.3,1) both}   /* whole field bursts out from the centre once, dots keep converging */
@media (prefers-reduced-motion:reduce){.eosDotField i,.tsPixarRoot .tsPxDust,.tsArcade .cinemaDust i{animation:none!important;opacity:.35!important}.eosCore{animation:none!important;scale:1}}
```
`EosDotField` markup is 24 `<i>` elements, each with `left`/`top` on the 35-60 % ring (`r = 35 + 25·noveltyNoise`, `θ = 2π·noveltyNoise`), `--s` 2-6 px, `--t` 8-17 s and `--dl` −0…−t, all seeded by `noveltyNoise(i, seed)`. `EosCore` updates `--eos-h` / `--eos-core-a` from progress via `style.setProperty`, polling `aria-valuenow` at 3 Hz while in play. Optional 99_pixar edit: spawn motes over the full height (`top: pxNoise(i,23)*100%` instead of `40 + …*60`), so they arrive from above as well as below.

---------------------------------------------------------------------------------------------------
## D. The emotion-first flow

### D.1 The 12 check-in states (data: `EOS_EMOTIONS` in `src/eos/00_core.jsx`)
Seven existing characters become a recognisable cast, all original IP. Do **not** use the "Inside Out" name, its character names or its likeness; take inspiration only. Each character "owns" 1-2 states and has `RELEASE_PHASE_EMOTIONS` negative and positive expression sets (L2972) for its faces.

| id | chip label | character | hue | regulation | meter word | spark word | existing profile (copy) | seed words (used only if the user gives none; shown in the composer, editable) |
|---|---|---|---|---|---|---|---|---|
| `panic` | PANIC | RUSH | 8 | down, body first | SLOW-DOWN | CALM | panic | racing heart · tight chest · what if · too fast · can't breathe · alarm |
| `anxiety` | ANXIOUS | LOOPIE | 268 | down: ground, contain | GROUND | GROUND | panic | what if · tomorrow · worst case · on edge · can't settle · worry |
| `anger` | ANGRY | RUSH | 0 | short discharge, then down | COOL-DOWN | COOL | anger | so unfair · hot face · clenched jaw · had enough · boiling · them |
| `overthinking` | OVERTHINKING | LOOPIE | 285 | interrupt + defuse | UNLOOP | CLEAR | rumination | replaying it · should have · why did I · again · on loop · can't stop |
| `overwhelm` | OVERWHELMED | GLITCH | 190 | offload + chunk | MAKE SPACE | SPACE | overwhelm | too much · no time · everything · behind · can't start · drowning |
| `sad` | SAD | DROP | 215 | soothe, then lift | LIGHTEN | LIGHT | sadness | heavy · miss it · it hurts · tired · lost · tears |
| `lonely` | LONELY | DROP | 228 | connect | CONNECT | WARMTH | sadness | alone · left out · nobody gets it · quiet room · unseen · miss people |
| `shame` | ASHAMED | PATCH | 28 | self-compassion | SELF-KIND | KIND | general | I messed up · so stupid · embarrassed · my fault · not enough · cringe |
| `fear` | SCARED | SYNC | 196 | approach | BRAVE | BRAVE | fear | scared · dread · what if it happens · can't face it · danger · unknown |
| `jealous` | JEALOUS | PATCH | 96 | redirect to own wins | OWN GLOW | GLOW | general | they have it · why not me · behind them · not fair · comparing · less than |
| `numb` | NUMB | GLITCH | 220 | **up**-regulate | WAKE-UP | SPARK | general | nothing · flat · empty · blank · meh · far away |
| `good` | GOOD | STILL | 48 | savour + bank it | SAVOUR | JOY | general | good moment · grateful · proud · light · smiled · enough |

The "existing profile" column feeds the arcade's own copy (`RELEASE_COMPACT_FEEDBACK`, spark names, meter names). It's applied through optional edit E18, which makes `releaseEmotionProfile()` return the checked-in profile first, so the in-game text matches the chosen feeling (e.g. "COOL SPARKS" for anger even when the text never says "angry").

### D.2 Check-in screen (`EosCheckIn`, overlay inside `.releaseStage`, z 30; the composer stays live underneath)
Shown whenever `stage === "input" && !selected` and `eos.phase !== "skip"`. It *is* the home screen. The abyss background stays, and `.releaseIdleStory` is hidden.
```
            What's loudest right now?                       (hero 30-44 px)
   (RUSH)   (LOOPIE)  (RUSH)  (LOOPIE)  (GLITCH)  (DROP)    12 glass orbs, 76 px desktop / 64 px phone
   PANIC   ANXIOUS   ANGRY  OVERTHINK  OVERWHELM   SAD      label 13 px under each; 6×2 grid desktop, 4×3 phone
   (DROP)   (PATCH)  (SYNC)  (PATCH)   (GLITCH)  (STILL)
   LONELY  ASHAMED   SCARED  JEALOUS     NUMB      GOOD
                     just let me play →                     (13 px link; sets phase "skip")
```
1. **Tap an orb** (1 tap). The orb flies to centre with anticipation, overshoot and squash-stretch (framer-motion spring, stiffness 420, damping 18). The others dim to .25, and the character's face swaps to a stronger negative expression. Sound: `sfx("soft")` plus an emotion chord. First-time users see the EOS arrow (`tap`, "TAP HOW YOU FEEL") on the first orb.
2. **"How big?"** (1 tap or drag). `EosIntensityDial` is a 10-segment arc (0-10, default **6** pre-lit) around the big character; segment colours run from calm cyan to the emotion hue.
   - **Feedback:** the character scales .85 → 1.25 with the value, the number shows at hero size, there's a haptic tick per segment (`vibrate(6)`), and the pitch rises.
   - **Input:** number keys 1-9 and 0 set the value; drag scrubs across segments.
   - Microcopy on first use only: *"Naming it already turns it down a notch."* (affect labelling).
3. **Words (optional).**
   - "Add your words (optional)" plus a 🎙 button: the link focuses `input.releaseThoughtInput`, and the mic calls the existing `toggleMic` (passed in as a prop).
   - Three seed chips for the emotion ("racing heart", "what if", "tight chest") toggle into `raw`.
   - If `raw` is still empty on GO, the full seed string is written into `raw`. The words are visible and editable in the composer, so it's honest that the game uses feeling-words.
4. **GO**, a big pill: `SHIFT IT ▸`, with the sub-line "≈30 s · SIGH SURFER" (the router's pick, which updates live as the intensity changes). Enter also triggers it.
   - **Launch mechanics:** GO calls `EosCommit({emotion, before})`, then `setRaw(seed)` if needed. A `useEffect` in `EosCheckIn` waits for `raw` to be non-empty and calls `onGo()` = `startThinkStillChoice` exactly once (the stale-closure safe path from `map_main` E2).
5. **Budget:** emotion + intensity + GO is 3 taps, about 4 s. Skip path: "just let me play" restores today's composer flow unchanged (drive.mjs untouched).
6. **Safety:** if `raw` matches §H, the safety card shows above the check-in. GO still works and routes to gentle games.

Layout: on phone (390 × ~690 stage) the 4×3 grid is 64 px orbs + 12 px gaps, which fits in 300 px of height. The dial is 220 px. Everything stays inside `.releaseStage`, so the composer (z 240) is never covered.

### D.3 No check-in? Auto-detect (`EosDetectEmotion(text)` in `01_detect.jsx`)
- Score-based lexicon, not first-match:
  - Each emotion has stem regexes with inflections, e.g. panic `/\b(panic\w*|freak\w*\s*out|heart\s*(is\s*)?(racing|pounding)|can'?t\s*breathe|hyperventilat\w*|losing\s*it)\b/gi`, anger `/\b(ang(ry|er|rier)|furious|rag(e|ing|ed)|pissed|livid|mad\s+at|hate\b|annoy\w*|irritat\w*|so\s+unfair)\b/gi`, sad `/\b(sad\w*|depress\w*|cry\w*|tears?|grie(f|ving)|heartbroken|miss(ing)?\s+(him|her|them)|lonely|down\b)\b/gi`.
  - The full list (12 × ~10 stems) goes in the module. It fixes the "panicking / raged / sadder / overwhelming / scary / annoyed" misses (`map_main` §4).
  - Score = hits × weight (1 for normal stems, 1.5 for strong ones). The top score wins; ties go to the higher-arousal state.
- **Intensity guess** starts at 5:
  - +1 per intensifier (`so|really|extremely|totally|can't|never|always|completely`), max +2;
  - +1 for ≥2 ALL-CAPS words;
  - +1 for `!!` or "!!!".
  - Clamp to 3-9.
- **UI:** when launched from the composer (Enter / LET THINKSTILL CHOOSE), a 2.5 s toast-chip appears in `.releaseComposerStatus`: "Sounds like **ANGER · 7** — tap to change". Tapping it opens the check-in with those values pre-selected. No chip if nothing matched (`general`).

### D.4 Matched relief path (rules the router applies, details in §E)
1. **Band** = high (7-10) / mid (4-6) / low (1-3), from `before`.
2. **Act 1** = top-ranked game for (emotion, band), skipping LAB ids, the ids played in the last 3 sessions (unless that empties the list) and the excluded id. With personal history, `+0.6 × avgΔ(emotion,id)/10` is added to rank weight once ≥2 samples exist ("what works for YOU"). There's 15 % exploration (pick #2 or #3) **only in mid/low bands**: at high distress always pick the most reliable game.
3. **Act 2 (offered, never forced)** after the re-rate when either:
   - Δ < 2, or
   - the emotion is `anger` and Act 1 was a discharge game (2, 3, 4, 13, 15, 61, 68, 100). Anger always gets the cool-down offer, because discharge alone doesn't lower anger (§1).
   Act 2 = `EOS_SECOND_ACT[emotion]` (§E.2), shown as the primary button: "20-sec cool-down ▸".
4. **Never route** a destruction game for sad, lonely or shame at high intensity, or when the safety flag is on.

### D.5 Before → after Shift Meter (`EosShiftMeter`, inserted above `.releaseShiftCheck` on the reveal card, edit E8)
```
   (RUSH, angry face, size ∝ 8)          How big is it now?
        BEFORE 8           ───►      [ 0 1 2 3 4 5 6 7 8 9 10 ]   ← same EosIntensityDial, pre-set to 8
```
After one tap:
- **Morph (1.2 s):** the before-orb shrinks to the new size and its hue slides toward calm. The face swaps to a positive expression of the same character. The number counts down 8 → 3 with a tick sound per step and a descending pitch.
- **Headline:** **`ANGER 8 → 3`**. Sub-line: `−5 in 41 s · your best cool-down yet ✦`. The "best" comparison uses only the user's own history.
- **Tiered celebration (it celebrates the shift but pays the ritual):**
  - Δ ≥ 5: mega burst (existing `RewardSurgeBurst mega`) and a "CORE MEMORY" gold-rim orb.
  - Δ 2-4: standard orb burst.
  - Δ 0-1: no confetti. Copy: *"Still big — that's okay. Big feelings sometimes need two moves."* The Act-2 button becomes primary.
  - Δ < 0: copy *"It got louder. That happens. Let's go gentle."* → Act-2 = the emotion's gentlest game (109, 110, 111 or 117).
- **Buttons:** `SHARE MY SHIFT` (§G.4) · `ONE MORE` (Act 2, or same game) · `DONE FOR NOW ✓` (big, equal weight, which ends the session and returns to check-in). The old YES/NOT YET row is hidden with `.releaseShiftCheck .releaseShiftChoices{display:none}`. `↻ AGAIN` and the side PREVIOUS/NEXT stay.
- **No check-in session:** the meter asks both in one widget: "before you started: [dial]" then "now: [dial]".
- **Timing:** time-to-relief = `afterAt − launchAt`, shown as "in 41 s".

### D.6 What the reveal awards (all in `65_rewards.jsx`)
| reward | rule | visible as |
|---|---|---|
| ⚡ STILL (existing score) | existing `gain` + `EosRoundBonus()` (round sparks) + **+25 for completing the after-rating** (ritual bonus, independent of Δ) | header ⚡ counts up as the particles land |
| **Memory Orb** (collectible) | one per completed loop (after-rating given). Picks a **positive expression** of the emotion's character that the user doesn't own yet. Rarity: 70 % common / 25 % rare (glow rim) / 5 % gold (Core Memory, also always granted at Δ ≥ 5 or a 7-day milestone) | orb flies into the header shelf chip "◉ 23" |
| Calm Days | the day counts if ≥1 check-in **or** after-rating happened | header chip "☀ 5/7" |
| Mastery | per emotion: completed loops → rank: Rookie (1) → Steady (5) → Pilot (15) → Master (40) | rank badge on the shift card + check-in orb ring |
| Personal best | fastest time-to-Δ≥2 per emotion | "your best cool-down yet" |

### D.7 Session store + storage keys (`00_core.jsx`, `10_session.jsx`)
- **Store:** `EOS_STORE` is a tiny external store (`get`, `set(patch)`, `subscribe`). `useEosSession()` reads it with `React.useSyncExternalStore` (React 18). Plain functions (`EosCommit`, `EosMarkLaunch`, `EosMarkFinish`, `EosReset`) can therefore be called from any arcade callback with **no dependency-array edits**.
- **Shape:** `{ phase: "checkin"|"skip"|"play"|"meter", emotion, before, after, source: "checkin"|"detect", launchAt, finishAt, gameId, act: 1|2, safety: null|"selfharm"|"abuse", roundSparks, soundOn }`.
- **localStorage** (all `try/catch`, all prefixed `eos:v1:`):

| key | value | cap |
|---|---|---|
| `eos:v1:history` | `[{t, emo, b, a, gid, ms, act}]` | last 300 |
| `eos:v1:orbs` | `[{char, expr, rarity, emo, t, b, a}]` | none (max 700 unique) |
| `eos:v1:days` | ISO dates with a loop | last 60 |
| `eos:v1:seen` | game ids already taught by arrows | — |
| `eos:v1:pb` | `{emo: ms}` personal best time-to-Δ≥2 | — |
| `eos:v1:prefs` | `{shareWords:false, checkin:true}` | — |
- **Nothing the user typed is ever stored.** History holds only emotion, numbers and the game id. The safety scan runs in memory only.

---------------------------------------------------------------------------------------------------
## E. Emotion → game routing

### E.1 Routing table (`EOS_ROUTES` in `30_router.jsx`; ids in rank order; ★ = new game)
| emotion | HIGH 7-10 (body first) | MID 4-6 (signature) | LOW 1-3 (meaning / humour) | Act 2 (`EOS_SECOND_ACT`) |
|---|---|---|---|---|
| **panic** | ★111 SIGH SURFER, 109 CLEANSE, 102 FINGER TRAP, 65 PAUSE, 69 PULSE | 102 FINGER TRAP, 36 CLOUD PASS, 77 SLOW MOTION, ★113 GROUND CONTROL, 71 DEFUSE, 55 HEADLINE | 105 DRAMA MACHINE, 55 HEADLINE, ★113, 1 POP | ★111 (else 109) |
| **anxiety** | ★111, ★113, 102, 109 | ★113 GROUND CONTROL, 95 SHELF IT, 32 PARK IT, 101 TUG OF WAR, 24 SLINGSHOT, 34 RIVER, 31 BACK SEAT, 85 CONTROL PANEL | 1 POP, 104 VOLUME KNOB, 86 FACT/STORY, 30 ZOOM OUT, 105 | ★113 (else 111) |
| **anger** | ★112 LET OFF STEAM, 100 HOT POTATO, 4 STOMP | 100 HOT POTATO, 4 STOMP, 15 SHRED, 18 BURN, 61 FREEZE, 68 DRUM IT, 2 CRUSH | 52 SUBTITLES, 107 GO WEIRD, 64 RED LIGHT, 11 PRESSURE POP, 37 ELEVATOR DOWN | ★112 (else 109, 65) — **always offered after a discharge game** |
| **overthinking** | 61 FREEZE, ★114 BROKEN RECORD, ★111 | ★114, 61, 43 CUT THE LOOP, 41 UNHOOK, 22 FLUSH, 29 MUTE, 34 RIVER | 105, 107, 52, 104, 99 ECHO | ★113 (attention to senses) |
| **overwhelm** | ★111, 93 SPACE MAKER, 21 BIN | ★120 ONE THING, 93, 21, 95 SHELF IT, 87 KEEP/DROP, 28 ARCHIVE | 85 CONTROL PANEL, 30 ZOOM OUT, 39 BLACK HOLE, 81 STACK IT | ★120 |
| **sad** | 110 RAIN OUT, 109 CLEANSE, ★117 LANTERN SKY | 110, ★117, 33 FLOAT AWAY, 40 PAPER PLANE, 75 INK BLEED | 106 TINY SOUNDTRACK, 88 TRADE MACHINE, ★118 COLOUR RUSH | ★117 (else 106) |
| **lonely** | ★117, 110, ★115 PATCH UP | ★117, 106, 88, ★115 | ★118, 106, ★117 | ★117 (signal step) |
| **shame** | ★115 PATCH UP, 109, 110 | ★115, 104 VOLUME KNOB, 84 MINE/NOT MINE, 19 ERASE, 14 CRUMPLE, 18 BURN | 107 GO WEIRD, 79 MISS ON PURPOSE, 53 CARTOONIFY, 51 MIRROR FLIP | ★115 |
| **fear** | ★111, ★116 SHADOW SHRINK, 102 | ★116, 31 BACK SEAT, 97 X-RAY, 53 CARTOONIFY, 86 FACT/STORY, 89 DOOR A/B (only if text contains " or "/"vs") | 107, 105, 53 | ★116 (else 111) |
| **jealous** | ★119 YOUR SPOTLIGHT, 47 UNFOLLOW | ★119, 47, 45 MAGNETS, 25 SWIPE AWAY, 88 TRADE | ★119, 88, 107 | ★119 |
| **numb** | ★118 COLOUR RUSH, 68 DRUM IT, 74 BUBBLE WRAP | ★118, 68, 74, 1 POP, 106, 107 | ★118, 106, ★117 | ★118 (else 117) |
| **good** | — | ★118 (savour mode), ★119 (wins mode), 106 | same | — |
| **general** (no match) | 1 POP, 102, 100, 110, 25, 93 → then fall back to `chooseRelevantGame` | | | |
Until a ★ game ships, its slot is skipped automatically: the router filters ids against `GAMES`.

### E.2 `EosRouteGame` (pure, reads the store; used by edits E4/E5)
```js
function EosRouteGame(text, played = [], excludeId = null) {
  const st = EOS_STORE.get()
  const det = st.emotion ? null : EosDetectEmotion(text)
  const emo = st.emotion || det?.id || "general"
  const lvl = st.before ?? det?.intensity ?? 5
  const band = lvl >= 7 ? "high" : lvl >= 4 ? "mid" : "low"
  const route = EOS_ROUTES[emo] || EOS_ROUTES.general
  let ids = (route[band] || route.mid).filter((id) => id !== excludeId && !EOS_LAB_IDS.has(id) && GAMES.some((g) => g.id === id))
  if (st.safety) ids = [...new Set(ids.filter((id) => EOS_GENTLE_IDS.has(id)).concat([111, 109, 110, 117]))].filter((id) => GAMES.some((g) => g.id === id))
  if (!ids.length) return null
  const recent = eosRecentGameIds(3)                      // from eos:v1:history
  const scored = ids.map((id, rank) => ({ id, s: 1 - rank * 0.12 + 0.06 * eosPersonalDelta(emo, id) - (recent.includes(id) ? 0.5 : 0) + (played.includes(id) ? 0 : 0.08) }))
  scored.sort((a, b) => b.s - a.s)
  const pick = band !== "high" && scored.length > 2 && Math.random() < 0.15 ? scored[1 + (Math.random() < 0.5 ? 0 : 1)] : scored[0]
  return GAMES.find((g) => g.id === pick.id) || null
}
```
`EOS_GENTLE_IDS = {109, 110, 111, 113, 115, 117, 33, 40, 95, 106, 118}`. The menu also gets an optional group above "15 SIGNATURE RELEASES" (edit E19): `FOR YOUR {EMOTION}`, the top 4 routed ids rendered as `button.releaseChoiceItem` with `<span><b>{name}</b></span>`, so `drive.mjs` keeps matching names.

### E.3 Verdict for every existing game (tier, emotions, the fix that unlocks it)
**S** = flagship for an emotion · **A** = routed · **B** = menu, plus routed only as a late fallback · **LAB** = playable from the menu, never routed (demoted, not deleted; drive.mjs and the audits keep working).

| id | name | tier | best for | fix needed (beyond arrows + type) |
|---|---|---|---|---|
| 1 | POP | **S** | anxiety-low, overthinking, numb, general | dedupe short-input chunks (E17) |
| 2 | CRUSH | A | anger | make the blob itself tappable (later) |
| 3 | CRACK | B | frustration | tapping an egg before arming should auto-arm |
| 4 | STOMP | **S** | anger act 1 | auto-arm on first slot tap; then offer act 2 |
| 5 | HAMMER | LAB | — | timing is fake; merged into 4 |
| 6 | ZAP | B | overthinking interrupt | hint fixed (§A.6) |
| 7 | PIN POP | B | catastrophising | — |
| 8 | METEOR | B | worry | occlusion fixed (§A.7) |
| 9 | LASER SLICE | LAB | — | cluster-A clone, guide was wrong |
| 10 | DOMINO DROP | LAB | — | tap-then-watch |
| 11 | PRESSURE POP | A | anger-low, panic-mid | show the green window; widen it to 55-92; a miss drops to 40, not 0; add `onPointerLeave` |
| 12 | BOUNCE OUT | LAB | — | duplicate of 2 |
| 13 | SQUASH | B | anger, stress | hold ring (overlay); add `onPointerLeave` |
| 14 | CRUMPLE | A | shame | live corner highlight (§A.7) |
| 15 | SHRED | A | anger, shame | 5 → 3 taps per word |
| 16 | MELT | B | anger cool-down | confirm hold vs tap; hint fixed |
| 17 | BOSS BATTLE | LAB | (fear) | occlusion + live spot + bigger word, then re-promote |
| 18 | BURN | A | anger, grief, shame | hold 3 s → 1.8 s per word |
| 19 | ERASE | A | shame, regret | auto-activate on first rub |
| 20 | GLITCH OUT | B | intrusive thoughts | a wrong tap keeps the step |
| 21 | BIN | A | overwhelm | drop radius 32 → 90 px; show BIN ALL only after 2 binned |
| 22 | FLUSH | A | rumination | — |
| 23 | VACUUM | LAB | — | passive; duplicate of 22 |
| 24 | SLINGSHOT | A | anxiety, anger-mid | flight follows the pull vector |
| 25 | SWIPE AWAY | A | intrusive, jealousy | accept left swipes too |
| 26 | SEND TO SPACE | B | worry | lever next to the rocket |
| 27 | DROP ZONE | B | burden | ledge affordance |
| 28 | ARCHIVE | B | overwhelm | absorbs 38 |
| 29 | MUTE | A | inner critic, rumination | — |
| 30 | ZOOM OUT | A | anxiety-low, overwhelm-low | progress per tap (no 4-tap wait) |
| 31 | BACK SEAT | A | anxiety, fear | accept a drop anywhere in the seat rect |
| 32 | PARK IT | A | worry | labels 7 → 14 px (CSS) |
| 33 | FLOAT AWAY | A | sadness | any order (or live highlight) |
| 34 | RIVER | A | anxiety, rumination | longer drift |
| 35 | TRAIN PLATFORM | LAB | — | no timing, passive |
| 36 | CLOUD PASS | **S** (panic-mid) | panic, anxiety | visible tempo meter ("slow" zone) |
| 37 | ELEVATOR DOWN | B | anger-low | start floor = check-in intensity |
| 38 | DRAWER | LAB | — | 3-step chore; duplicate of 28 |
| 39 | BLACK HOLE | B | overwhelm-low | hold on the object; `onPointerLeave` |
| 40 | PAPER PLANE | A | sadness, regret | — |
| 41 | UNHOOK | A | rumination, attachment | — |
| 42 | UNTANGLE | LAB | — | hidden order + occlusion |
| 43 | CUT THE LOOP | A | rumination | instruction overlaps the button |
| 44 | VELCRO | B | stuckness | — |
| 45 | MAGNETS | B | jealousy, craving | — |
| 46 | UNPIN | B | stress | — |
| 47 | UNFOLLOW | A | jealousy, comparison | — |
| 48 | UNSTICK | B | stuckness | collapsed sticker (§A.7) |
| 49 | UNZIP | B | overthinking | — |
| 50 | UNFINISHED SENTENCE | LAB | — | typing in crisis; can deepen catastrophising |
| 51 | MIRROR FLIP | B | shame-low | 7-8 px buttons (CSS) |
| 52 | SUBTITLES | A | anger-low, rumination-low | — |
| 53 | CARTOONIFY | A | fear, shame (humour) | — |
| 54 | FONT CHECK | LAB | — | duplicate of 53 |
| 55 | HEADLINE | A | panic, catastrophising | — |
| 56 | COURTROOM | LAB | — | one-tap form (keep 86) |
| 57 | CAMERA ANGLE | LAB | — | pill tapping |
| 58 | MICROSCOPE | B | fixation | progress per tap |
| 59 | SPOTLIGHT | B | attention shift | occlusion (§A.7); its scene seeds ★119 |
| 60 | CROP TOOL | B | catastrophising | live highlight |
| 61 | FREEZE | **S** (rumination interrupt) | racing thoughts, anger | 6 px labels (CSS) |
| 62 | NET IT | LAB | — | fake catch |
| 63 | PATTERN POP | LAB | — | fake prediction |
| 64 | RED LIGHT | A | anger-low, impulsivity | "almost!" on early taps |
| 65 | PAUSE BUTTON | A | panic-high, anger | release no longer halves; `onPointerLeave` |
| 66 | BUFFERING | B | urge-surfing | breath orb during the wait (core brightens); absorbs 80 |
| 67 | TAP OUT | B | anxiety (bilateral rhythm) | highlight next side + soft beat |
| 68 | DRUM IT | A | anger discharge, numb | 4 distinct drum voices |
| 69 | PULSE | A | panic | visible breath orb + tempo rule |
| 70 | METRONOME | B | impulsivity | fail feedback → "almost" |
| 71 | DEFUSE | A | panic-mid | 6 px labels; 6 → 3 rounds |
| 72 | CATCH & LABEL | A | anxiety (affect labelling) | — |
| 73 | TRAFFIC LIGHT | LAB | — | form |
| 74 | BUBBLE WRAP | A | anxiety stim, numb | free-pop order (then `seq` → `tap`) |
| 75 | INK BLEED | A | sadness, shame | — |
| 76 | REVERSE IT | LAB | — | pill tapping |
| 77 | SLOW MOTION | A | panic, racing thoughts | label the brake |
| 78 | ONE WORD | LAB | — | single-button "choice" |
| 79 | MISS ON PURPOSE | A | perfectionism, shame-low | celebration on miss |
| 80 | DON'T TAP | LAB | — | merged into 66 |
| 81 | STACK IT | B | overwhelm-low | — |
| 82 | SEESAW | LAB | — | precision chore |
| 83 | SORT STATION | LAB | — | form; duplicate of 85 |
| 84 | MINE / NOT MINE | A | guilt, over-responsibility | eject the NOT MINE card |
| 85 | CONTROL PANEL | A | anxiety, overwhelm | ASK HELP → opens the support card (§H, soft variant) |
| 86 | FACT / STORY | A | anxiety, overthinking | use the whole sentence, not one-word chunks |
| 87 | KEEP / DROP | A | overwhelm, rumination | — |
| 88 | TRADE MACHINE | A | sadness, loneliness, jealousy | — |
| 89 | DOOR A / B | B | decision fear | routed only when the text has "or"/"vs" |
| 90 | COIN FLIP | LAB | — | passive; reaction step missing |
| 91 | PRIORITY BLOCKS | LAB | — | drop location ignored |
| 92 | SCALE DOWN | LAB | — | absorbed by the Shift Meter |
| 93 | SPACE MAKER | **S** (overwhelm) | overwhelm, anxiety | — |
| 94 | JUGGLE | LAB | — | keeps a negative word |
| 95 | SHELF IT | **S** (worry containment) | anxiety, overwhelm | — |
| 96 | SCRATCH REVEAL | LAB | — | anti-relief (reveals the distress word) |
| 97 | X-RAY | A | fear, overthinking | — |
| 98 | MAGIC TRAPDOOR | A | catastrophising | 5 px labels; drop all bubbles at the end |
| 99 | THE ECHO CHAMBER | B | rumination | 3.9 px text (E15); keep the hold on release |
| 100 | HOT POTATO | **S** (anger) | anger, frustration | words 9 → 16 px |
| 101 | TUG OF WAR | **S** (control struggle) | anxiety, anger | hint ×3 → ×6 (fixed) |
| 102 | FINGER TRAP | **S** (panic, anxiety) | panic, anxiety | shorter slide on phone |
| 103 | SINKING PLATFORM | B | burden | — |
| 104 | VOLUME KNOB | **S** (inner critic) | shame, rumination | — |
| 105 | DRAMA MACHINE | **S** (catastrophising) | panic-low, fear-low | — |
| 106 | TINY SOUNDTRACK | A | sadness, loneliness, numb | — |
| 107 | GO WEIRD | A | fear, shame, anger (humour) | — |
| 108 | WORD SALAD | LAB | — | rebuilds the negative sentence |
| 109 | CLEANSE | **S** (panic act 2) | panic, anxiety, shame-high | 3.2 s lock → 1.2 s |
| 110 | RAIN OUT | **S** (sadness) | sadness, grief, loneliness | — |

`EOS_LAB_IDS = [5, 9, 10, 12, 17, 23, 35, 38, 42, 50, 54, 56, 57, 62, 63, 73, 76, 78, 80, 82, 83, 90, 91, 92, 94, 96, 108]` (27). That leaves 83 routable existing games plus 10 new ones. A LAB game is re-promoted by removing its id once its fix lands.

---------------------------------------------------------------------------------------------------
## F. Ten new games (ids 111-120)

### F.0 Shared engine contract (every new game follows it; see `map_engine_hud` §5)
- One file per game: `src/eos/9N_game_<id>_<slug>.jsx`. At top level it does:
  - `GAMES.push(def)`
  - `EOS_ENGINES[id] = Comp`
  - `SHORT_ACTION[id] = SHORT_HINT[id] = "…"`
  - `RELEASE_MIND_BEND[id] = "…"`
  - `EOS_CSS_PARTS.push(css)`
  
  Ids ≥100 run in `GameEngine`, so they get its reward bursts. Route via edit E12.
- `def`:
  - Required fields: `{ id, name, family, engine: "E04", prompt, object, action, mechanism, hook, surprise, mindBend, score, replay, sound, notes }`.
  - **`engine: "E04"`** makes `usesExplicitProgress()` true without editing L3623.
  - `family` must be an existing key (`Release`, `Reframe`, `Balance`, `Rhythm`, `Distance`, `Absurdity`…), so the menu icons and music resolve.
- Root: `<div className="arena eosArena eos<Name>">`. Avoid the wrapper's auto-skin and collision classes (`allCircularBubble`, `wordBubble`, `uniqWord`, `tsThoughtLabelHost`, `tsStandardBubble`), so `GameEngine`'s DOM audit leaves EOS games alone.
- **Arrow contract:** the live target carries `data-eos-target="1" data-eos-g="hold" data-eos-label="HOLD · BREATHE IN"` (plus `-dir`, `-d`, `-n`, `-ms`, `-to` as needed). Move the attribute as the target changes. No table entry needed.
- Progress: call `onProgress(0, "0/3 …")` on mount, then increasing **0..100** with a short label. Call `onDone(bonus)` once, 450 ms after reaching 100. The wrapper then holds the celebration for 4 s; during it the character face flips positive.
- Sound: `sfx(kind)` for discrete hits (`tap pop soft win spark chime bell plink clack hum tone tskey:clean:i`). Continuous audio uses `EosAudio` (own `AudioContext`, gated by `EOS_STORE.get().soundOn`, which `useEosSession` mirrors). `rainSfx(seconds)` (brown noise) is available for exhales.
- Words: `eosWords(entries, n)` gives unique, non-sentinel chunks via `displayText(w, 22)`, rendered with `<ExactWords text={w} max={22} min={15} />`. Image-only input shows the upload instead.
- Character art: `eosFace(char, "neg"|"pos", k)` → `emotionSrc(char, RELEASE_PHASE_EMOTIONS[phase][char][k % n])`.
- Squash & stretch: framer-motion `whileTap={{ scaleX: 1.1, scaleY: .88 }}` plus spring `{ stiffness: 520, damping: 17 }`. Haptics: `vibrate(8)` per touch and `vibrate([12, 40, 18])` per success.
- Reduced motion: no travel, shake or orbit. State changes become opacity/colour cross-fades, and every timing stays the same.
- Hard limits: ≤45 s to win, **no fail state** (mistakes slow progress, never reset it), works one-thumbed at 390 px, all text ≥ 14 px.

### F.1 ★111 SIGH SURFER — panic (high), anxiety (high), fear (high), act 2 for anger and overwhelm
- **Fantasy:** "Your panic is a balloon-jellyfish. Two sips of air in, one long sigh out — and it floats your words away."
- **Mechanic & controls (one big target):**
  1. **Press & hold** the orb = inhale 1. Over 1.9 s it fills to 72 % and the first notch lights. Label: `HOLD · BREATHE IN`.
  2. **Release briefly and press again within 0.8 s** = sip 2, the "top-up". It fills 72 → 100 % in 0.7 s, the second notch lights, and you hear a bright "tink" (`sfx("tone")`). If you miss the gap, the game just goes on to the exhale (no fail).
  3. **Let go** = the long exhale. The orb drains over **6 s** and the user is cued *"sigh it out… slowly, like through a straw"*. Brown-noise wind plays (`rainSfx(6)`), and **two word-bubbles detach**, rise and pop softly into stars (`sfx("plink")` each).
  4. Three cycles release all 6 words.
- **Science:** the physiological sigh / cyclic sighing (double inhale re-inflates alveoli, long exhale slows heart rate through respiratory sinus arrhythmia). Daily practice improved mood and lowered respiratory rate more than mindfulness (Balban et al. 2023). The 4.5 s + 6 s cycle sits near the ~6/min resonance rate.
- **Win:** 3 cycles × ~9 s, plus a 3 s intro ≈ **30 s**.
- **Juice:**
  - Inhale: the orb has squash-stretch wobble on each sip, a rising hum (`sfx("hum")`), and **the background dots rush into the orb** (it sets `--eos-core-a` high).
  - Exhale: the dots drift back out.
  - Faces: RUSH (negative) → RUSH (calmer) → STILL (positive) over the 3 cycles.
  - Haptics: a soft pulse on each sip, and a 3-pulse "ahh" at the end of the exhale.
- **Implementation sketch (~280 lines):**
```jsx
GAMES.push({ id: 111, name: "SIGH SURFER", family: "Release", engine: "E04", prompt: "Breathe your thought away",
  object: "breath balloon", action: "HOLD, SIP, LET GO", mechanism: "double inhale, long exhale",
  hook: "Two sips in. One long sigh out.", surprise: "Each sigh floats two of your words away.",
  mindBend: "A long exhale is your body's own brake pedal.", score: "3 sighs", replay: "whenever your chest feels tight",
  sound: "rising hum, wind out", notes: "EOS: physiological sigh" })
SHORT_ACTION[111] = SHORT_HINT[111] = "Hold to breathe in, tap again for a top-up sip, then let go slowly"
RELEASE_MIND_BEND[111] = "A long exhale is your body's own brake pedal."
EOS_ENGINES[111] = EosSighSurfer
function EosSighSurfer({ entries, onProgress, onDone, sfx, rainSfx, reduced }) {
  const words = React.useMemo(() => eosWords(entries, 6), [entries.join("|")])
  const [phase, setPhase] = React.useState("ready")            // ready | in1 | gap | in2 | out | done
  const [cycle, setCycle] = React.useState(0)
  const P = React.useRef("ready"), C = React.useRef(0), orb = React.useRef(null), fill = React.useRef(0), raf = React.useRef(0), gapT = React.useRef(0)
  const go = (p) => { P.current = p; setPhase(p) }
  const setFill = (v) => { fill.current = v; orb.current?.style.setProperty("--fill", v.toFixed(3)); eosCoreBoost(v) }
  const tween = (to, secs, then) => { cancelAnimationFrame(raf.current); const f0 = fill.current, t0 = performance.now()
    const step = (t) => { const k = Math.min(1, (t - t0) / (secs * 1000)); setFill(f0 + (to - f0) * (reduced ? k : eosEaseInOut(k)))
      if (k < 1) raf.current = requestAnimationFrame(step); else then?.() }; raf.current = requestAnimationFrame(step) }
  React.useEffect(() => { onProgress(0, "0/3 SIGHS"); return () => { cancelAnimationFrame(raf.current); clearTimeout(gapT.current) } }, [])
  const exhale = () => { go("out"); rainSfx?.(6); tween(0, 6, () => {
      const c = C.current + 1; C.current = c; setCycle(c); sfx("plink"); vibrate([10, 60, 10, 60, 10])
      onProgress(Math.round((c / 3) * 100), `${c}/3 SIGHS`)
      if (c >= 3) { go("done"); setTimeout(() => onDone(320), 450) } else go("ready") }) }
  const down = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId)
    if (P.current === "gap") { clearTimeout(gapT.current); go("in2"); sfx("tone"); vibrate(8); tween(1, 0.7); return }
    if (P.current !== "ready") return
    go("in1"); sfx("hum"); vibrate(8); tween(0.72, 1.9) }
  const up = () => { if (P.current === "in1") { cancelAnimationFrame(raf.current); go("gap"); gapT.current = setTimeout(exhale, 800) }
    else if (P.current === "in2") { cancelAnimationFrame(raf.current); exhale() } }
  const live = phase === "ready" || phase === "gap"
  return (
    <div className={`arena eosArena eosSigh ph-${phase}`}>
      <button ref={orb} type="button" className="eosSighOrb" onPointerDown={down} onPointerUp={up} onPointerCancel={up}
        onKeyDown={(e) => e.key === " " && !e.repeat && down(e)} onKeyUp={(e) => e.key === " " && up()}
        data-eos-target={live ? "1" : undefined} data-eos-g="hold" data-eos-ms="1900"
        data-eos-label={phase === "gap" ? "ONE MORE SIP!" : "HOLD · BREATHE IN"}>
        <img className="eosSighFace" src={eosFace(cycle >= 2 ? "still" : "rush", cycle >= 2 ? "pos" : "neg", cycle)} alt="" draggable={false} />
        <i className={`eosSighNotch n1 ${["in1","gap","in2","out"].includes(phase) ? "on" : ""}`} />
        <i className={`eosSighNotch n2 ${phase === "in2" || (phase === "out" && fill.current > .9) ? "on" : ""}`} />
      </button>
      <div className="eosSighWords">{words.map((w, i) => (
        <span key={i} className={`eosSighWord ${i < cycle * 2 ? "isGone" : ""}`} style={{ "--a": `${i * 60}deg` }}><ExactWords text={w} max={20} min={15} /></span>))}</div>
      <p className="eosSighCue">{phase === "out" ? "sigh it out… slowly" : phase === "gap" ? "+ one more sip" : phase === "done" ? "lighter." : "breathe in"}</p>
    </div>)
}
```
  CSS (excerpt):
  - `.eosSighOrb{--fill:0;width:min(46vw,260px);aspect-ratio:1;border-radius:50%;scale:calc(.72 + var(--fill)*.5);background:radial-gradient(circle at 35% 28%,#fff8 0 8%,hsla(var(--eos-h),95%,70%,.55) 30%,hsla(var(--eos-h),90%,40%,.25) 70%);box-shadow:0 0 calc(30px + var(--fill)*60px) hsla(var(--eos-h),100%,70%,.6)}`
  - Word bubbles sit on a ring: `rotate(var(--a)) translate(calc(150px + var(--fill)*40px)) rotate(calc(-1*var(--a)))`, plus a 40 s orbit spin, which reduced motion turns off.
  - `.isGone` animates `translate(0,-60vh) scale(.2)` and opacity 0 over 2.4 s.

### F.2 ★112 LET OFF STEAM — anger (high/mid), frustration; act 2 for any discharge game
- **Fantasy:** "Smash your angry words into the kettle — then let the steam out *slowly* until it sings instead of screams."
- **Act 1 SMASH (≤12 s):**
  - Six glowing lava-rock words hang above a cast-iron kettle. **Tap a rock twice:** the first tap cracks it (glow seams), the second shatters it into 8 shards that arc into the kettle mouth.
    - Feedback: `PremiumBurst` at the rock, a 4 px arena shake for 180 ms, `sfx("pop")`, `vibrate(14)`.
    - Combo floater: `SMASH ×3!`.
  - A fast flick on a rock also works: anything ≥ 60 px toward the kettle counts as both hits.
  - Each rock raises the gauge (needle 0 → 100, red) and the lid rattles faster (`sfx("clack")`).
- **Act 2 VENT (≈15-20 s):**
  - The kettle is at full pressure.
  - **Control:** press the big valve wheel and **drag down slowly**. Release rate = drag speed, shown on a mini speedometer with a green "slow & steady" band (40-140 px/s).
  - **In the band:** a big soft steam plume, the gauge drops steadily, a low whoosh (`EosAudio` filtered noise) and the cue *"breathe out with the steam"*.
  - **Too fast (>220 px/s):** a comic short whistle and `TOO FAST — EASY…`. The gauge still drops at half rate; nothing resets.
  - One vent = one press with ≥3 s in the band → gauge −34. **Three vents** → gauge blue, the kettle whistles a happy 3-note tune and pours a cup of tea.
  - Faces: RUSH red angry → orange → content.
- **Science:**
  - The discharge is kept short and playful. It gives agency and a quick hit, but it is **not** the active ingredient.
  - The **active ingredient is arousal reduction:** slow exhale plus a slow, controlled motor action (Kjærvik & Bushman 2024). Venting alone feeds anger (Bushman 2002).
  - The game teaches "slower = more relief" in the hand.
- **Win:** act 1 ~10 s + act 2 ~18 s ≈ **28 s**. Progress: act 1 0 → 40 %, act 2 40 → 100 %.
- **Build (~360 lines):**
  - DOM:
    - `.eosRocks > button.eosRock ×6`: `data-eos-target` on the nearest unsmashed rock, `g="taps" n=2`.
    - `.eosKettle > .eosGauge > i.eosNeedle` and `.eosValve`: in act 2 it carries `g="drag" dir="d" d=160 label="TURN IT SLOWLY ↓"`.
    - `.eosSpeedo > i.eosBand + i.eosSpeedNeedle`
    - `.eosSteam > i ×10`: blurred white blobs with a `rise` keyframe; opacity is driven by `--vent` (0..1).
  - Speed: an exponential moving average of `dy/dt` from `pointermove` (with pointer capture), sampled each rAF.
  - The valve visual rotates by the cumulative `dy`.
  - Reduced motion: no shake; steam is an opacity fade.

### F.3 ★113 GROUND CONTROL — anxiety (mid/high), panic (mid), overthinking act 2, dissociation
- **Fantasy:** "You're mission control. Light up 15 stars from your real surroundings and bring your little rocket back down to the ground."
- **Mechanic:**
  - A constellation of 15 stars in 5 rows: **5 SEE 👁 · 4 TOUCH ✋ · 3 HEAR 👂 · 2 SMELL 👃 · 1 BREATHE 🫁**.
  - **The prompt is the hero text** (18 px): *"Look around. Tap a star for each thing you can SEE."*
  - The next star glows (`data-eos-target`, `g="tap"`).
  - **Each tap** ignites the star with a rising pentatonic note (`sfx("tskey:clean:"+i%6)`).
  - **Gentle pacing:** the next star shows a 0.7 s "look" ring. An early tap is *queued*, not refused, which nudges the user to actually look.
  - **Each completed row** lowers the rocket one step. The user's worry words orbit the rocket, and each star dims one of them a little (opacity and blur).
  - **The last star** says *"one slow breath"*. Hold it for 4 s with a breath ring, then the rocket lands with a dust puff. Faces: LOOPIE spiral-eyes → STILL.
  - Optional: long-press a star to say or type what you noticed (mic). It's off by default, so it never becomes homework.
- **Science:** 5-4-3-2-1 grounding moves attention to exteroceptive input (attentional deployment, Gross 1998). The sensory search competes with worry for working memory. It's a widely used clinical technique; we claim fast attention shift, not a cure.
- **Win:** 14 taps at ~1.6-2.2 s each, plus a 4 s hold ≈ **30-38 s**.
- **Build (~240 lines):** the star layout is a fixed percentage map, each star a `button.eosStar` (`--x`, `--y`). The state is an index 0-14. The rocket is a CSS shape with a character face that moves by `translateY(row × 14%)`. The ignite keyframe uses `scale` 0.6 → 1.3 → 1 with a glow. Reduced motion: no orbit; the rocket steps.

### F.4 ★114 BROKEN RECORD — overthinking, rumination, inner critic, intrusive words
- **Fantasy:** "Drop your loudest thought on a vinyl and DJ-scratch it until it's just a silly noise."
- **Mechanic:**
  - **Picking the word:** the heaviest chunk goes on the record label:
    1. a lexicon hit (self-labels: *stupid, failure, useless, idiot, ugly, worthless, always, never*),
    2. else the longest non-stopword.
    
    Up to 3 alternative word-chips let the user swap it (`choose`).
  - **Spin it:** drag in circles on the record, either way. Angle accumulates via `atan2` around the centre: **1 full turn = 1 repetition**. Back-and-forth scratches count 0.5 per reversal ≥ 60°.
  - **Each repetition "says" the word:**
    - Uses `speechSynthesis` when available and sound is on, with `rate` ramping 0.9 → 2.2 and `pitch` 1 → 1.9 (chipmunk). It is throttled: `cancel()` runs before each `speak()`.
    - Fallback: two-tone syllable blips (`EosAudio`).
  - **Visual:** the word repeats around the rim as a spiral. Letters progressively jitter, space out and blur, and in the last 20 % they turn into shapes (◐ ◑ ◒ ◓). A "MEANING-O-METER" bar drops 100 → 0.
  - **Finish:** at 30 repetitions (or 25 s with ≥15; no fail) the record stops, the word peels off as a googly-eyed sticker, and the line reads *"it's just a sound."*. Faces: LOOPIE spiral eyes → normal eyes.
- **Science:** word-repetition defusion. Repeating a negative self-referent word aloud for ~30 s reduces its discomfort and believability (Titchener 1916; Masuda et al. 2004). This is ACT cognitive defusion.
- **Safety:** excluded by the router when the safety flag is on; never spins self-harm words.
- **Win:** ~20-28 s.
- **Build (~280 lines):**
  - `.eosRecord` is a `conic-gradient` vinyl with `rotate: var(--deg)` set from the accumulated angle through a ref, so there are no React re-renders per frame.
  - The rim text is 12 `span`s at `rotate(i × 30deg) translate(r)`.
  - `data-eos-target` with `g="scrub"`, label `SPIN IT ↻`.
  - Reduced motion: the record turns without blur.

### F.5 ★115 PATCH UP — shame, guilt, inner critic, embarrassment (also lonely act 2)
- **Fantasy:** "Your harsh words have been raining on PATCH, your little buddy. Heal him with kind words — then give yourself the same hug."
- **Mechanic:**
  1. A dark cloud rains the user's words as drops onto PATCH, who sits with a hurt expression.
  2. **Drag a kindness charm onto PATCH** (`dragTo`, `data-eos-to=".eosPatchBody"`). There are 3 glowing heart-charms in a tray, drawn from a bank of 24 friend-voice lines matched to the emotion:
     - *"Anyone could've slipped there"*
     - *"You're learning, not failing"*
     - *"One moment isn't all of you"*
     - *"That was really hard"*
     - *"I'd still sit next to you"*
     - …
     
     Each drop does three things:
     - a bandage and sparkle land on PATCH,
     - one word-drop in the cloud turns into a falling flower,
     - PATCH's face steps up one positive expression.
     
     Tap fallback: tapping a charm sends it flying to PATCH. An optional "✎ your own" charm takes typed words.
  3. After 3 charms: *"Now you. Hand on your heart — like PATCH."* A big warm heart appears. **Press and hold it (thumb or palm) for 5 s.**
     - While held, the heart's beat slows from ~90 to ~60 bpm, a warm hum plays, and there's a soft haptic on each beat.
     - Letting go pauses it ("keep it there…"); it never resets.
  4. End card: *"You'd say this to a friend. You're allowed to say it to you."*
- **Science:**
  - Self-compassion (Neff 2003; intervention meta-analysis, Ferrari et al. 2019).
  - Self-distancing: advice to a friend is wiser (Grossmann & Kross 2014).
  - Soothing touch on the chest reduces cortisol response (Dreisoerner et al. 2021).
- **Win:** 3 drags (~12 s) + 5 s hold + 3 s ≈ **22-28 s**.
- **Build (~300 lines):**
  - Charms use `motion.button drag dragSnapToOrigin`. `onDragEnd` hit-tests the PATCH rect, then `animate` flies the charm to PATCH.
  - The heart uses `scale` keyframes whose `animation-duration` is set from a ref while held. Reduced motion: no rain or beat motion; the heart glows instead.

### F.6 ★116 SHADOW SHRINK — fear, dread, catastrophising
- **Fantasy:** "Fears look huge in the dark. Grab the flashlight and watch each shadow shrink into a tiny, silly critter."
- **Mechanic:**
  - **Setting:** a dark room, using a CSS mask. Three giant wobbly shadow-monsters each carry one fear word in big outline type.
  - **Shining:** **press and drag anywhere** to aim the flashlight (`radial-gradient` mask following the pointer). **Keep the beam on a shadow**:
    - Each 100 ms shrinks it 3 % and sharpens it.
    - The real thing fades in at its base: a tiny SYNC critter holding a little sign with the word.
    - At 25 % size it squeaks *"oh. that's it?"* and pops into a sticker.
  - **Approach bonus:** the beam is tighter and stronger when the pointer is closer to the shadow, so the user *moves toward* it.
  - **Avoidance:** if the beam stays off every shadow for 1.5 s, the nearest shadow grows back 5 %, but never past its start size. Gentle "avoidance keeps it big" feedback, with no failure.
- **Science:**
  - Approach over avoidance. Expectancy violation ("huge threat" → "small thing") drives fear extinction learning (inhibitory learning, Craske et al. 2014).
  - Curiosity reappraisal.
  - Labelling: the word sits on the critter's sign.
- **Win:** 3 shadows × 3-5 s + transitions ≈ **20-30 s**.
- **Build (~260 lines):**
  - The arena-wide pointer handler (with capture) sets `--lx/--ly`.
  - A rAF loop accumulates dwell time while `dist(beam, shadow) < shadowRadius`.
  - Shadows are absolutely positioned divs with `scale` and `filter:blur()`.
  - `data-eos-target` on the biggest remaining shadow, `g="hold"`, label `SHINE THE LIGHT ON IT`.
  - Reduced motion: no wobble; the shadow shrinks in steps.

### F.7 ★117 LANTERN SKY — loneliness, sadness, grief, homesickness
- **Fantasy:** "Light a lantern for each lonely word and send it up into a sky full of lanterns — then send one warm signal to someone real."
- **Mechanic:**
  1. Three paper lanterns sit at the bottom, each holding a chunk.
  2. **Hold a lantern for 1 s** to light it (flame flicker, warm glow, hold ring).
  3. **Drag or flick it upward.** It floats up with sway, joins a sky of hundreds of tiny drifting lights, and its word glows, then softens into a star.
     - True copy rotates under it: *"Loneliness is one of the most human feelings there is."* · *"Right now, lots of people are looking up at the same sky."*
     - **No fake live counts.**
  4. A fourth lantern appears: **SEND A SIGNAL?** There are two equal buttons:
     - `Text someone "thinking of you"` → `navigator.share({ text: "Thinking of you 👋" })`, or a clipboard copy with the toast "Copied — paste it to someone".
     - `Not today` → equally celebrated, with no guilt.
     
     Both complete the game. Faces: DROP teary → soft smile.
- **Science:**
  - Common humanity (Neff 2003).
  - Prosocial micro-acts raise well-being (Curry et al. 2018).
  - Reaching out feels better than people predict (Epley & Schroeder 2014; Kumar & Epley 2018).
- **Win:** 3 × (1 s hold + ~2 s flight) + signal choice ≈ **15-25 s**.
- **Build (~260 lines):**
  - The lantern is a `motion.button`: hold timer, then `drag="y"` upward; release past −120 px flies it up with a spring.
  - The sky is a CSS dot field of 80 tiny `i` elements with slow rise; it reuses the `eosDotField` style with a rising variant.
  - `data-eos-target` follows the stages: lantern `g="hold"` → `g="drag" dir="u"` → signal `g="choose"`.

### F.8 ★118 COLOUR RUSH — numbness, flatness, low mood, boredom; savour mode for GOOD
- **Fantasy:** "Your world went grey. Drum it back into colour — every beat you hit paints the sky."
- **Mechanic:**
  - **Starting state:** a CSS-drawn town and sky under `filter: grayscale(var(--g)) brightness(var(--b))`, starting at `--g: 1` and `--b: .7`.
  - **The beat:** a soft beat starts at 96 bpm (`EosAudio` look-ahead scheduler: kick on 1 and 3, hats on the 8ths).
  - **Tapping:** tap anywhere. On phone there are 4 big thumb pads at the bottom.
    - **On-beat (±130 ms):** a big colour splash at the tap point (random joyful-palette hue, overshoot scale-in), grayscale −3 %, combo +1.
    - **Off-beat:** a smaller splash, −1 %. Never "wrong".
  - **Building up:** every 8 combo adds a music layer (bass → chords → melody arpeggio) and +4 bpm (max 112).
  - **The user's words:** they start as grey stones. A splash on a stone colours it and bursts it into confetti.
  - **At 60 % colour:** the whole cast pops out and bounces on the beat.
- **Savour mode** (emotion `good`): splashes print the user's good words in gold, and the end card says *"bank it ✦"*.
- **Science:**
  - Behavioural activation: action before motivation.
  - Music and rhythmic synchrony raise arousal and positive affect, engaging reward circuitry (Salimpoor et al. 2011).
  - Colour and novelty counter flat affect. It's an **up-regulation** game, the only kind numbness needs.
- **Win:** colour 100 % after ~30-40 on-beat taps ≈ **25-35 s**. Sound off → a visual metronome ring on the pads.
- **Build (~340 lines):**
  - Scheduler: `setInterval` 25 ms with 100 ms look-ahead on `AudioContext.currentTime`. Beat times sit in a ref, and tap judgement is `min |t − beat|`.
  - Splashes: a capped pool of 24 `i.eosSplash` nodes, recycled.
  - `data-eos-target` on the pads (`g="timing"`, `bpm` = current), label `TAP ON THE BEAT`.

### F.9 ★119 YOUR SPOTLIGHT — jealousy, comparison, envy, FOMO, low self-worth; wins mode for GOOD
- **Fantasy:** "Their highlight reel is hogging the spotlight. Swing it back onto your own stage and see what's been shining all along."
- **Mechanic:**
  - **Left:** a billboard holding the comparison words, lit by a giant spotlight. **Right:** your small dark stage with 3 pedestals.
  - **Each round:**
    1. **Drag the spotlight head** from the billboard to a pedestal (`dragTo`).
    2. **Pick a win.** A chip row (bank of ~20: *"I showed up today", "I helped someone", "I made someone laugh", "I kept going", "I learned something", "Someone trusts me"…*) or 2-3 typed words (optional).
    3. The pedestal rises into a gold trophy with the user's own win in 16 px gold letters, plus confetti and a chime. The billboard dims one step.
  - **End:** the billboard is dark and your stage is fully lit. Faces: PATCH envious → proud.
- **Science:**
  - Gratitude / "three good things" (Emmons & McCullough 2003; Seligman et al. 2005).
  - Self-affirmation lowers threat responses to social comparison (Cohen & Sherman 2014).
  - Attentional redeployment.
- **Win:** 3 × (drag + chip) ≈ **25-35 s**.
- **Build (~280 lines):**
  - The lamp head is a `motion.div drag` with snap-to-pedestal on `onDragEnd`.
  - The beam is an SVG polygon from the lamp to the target, updated through refs.
  - Stages: `data-eos-target` on the lamp (`g="dragTo"`, `to=".eosPedestal.empty"`) → chips (`g="choose"`).

### F.10 ★120 ONE THING — overwhelm, stress, to-do paralysis
- **Fantasy:** "Everything's falling on you at once. You only have to catch ONE — the rest can wait on the shelf."
- **Mechanic:**
  1. **The fall:** the user's chunks drop as soft blocks into a box that is too small. The box bulges and groans comically.
  2. **Sort each block:**
     - **Swipe LEFT → LATER shelf.** It slides onto a shelf with a "later" tag (worry postponement).
     - **Swipe RIGHT → LET GO.** It floats off as a balloon.
     - **Tap → NOW.** There's only one NOW slot; a second NOW asks "swap?".
  3. **The release:** when ≤1 block is left, the box **breathes out** (expands, plays a sigh sound).
  4. **Make it tiny:** the NOW block offers 4 chips (*just open it · first 2 minutes · one sentence · ask someone*), then "when?" chips (*now · after this · tonight*). It shrinks into one glowing pebble labelled "first 2 minutes · after this".
  5. **End:** an empty, calm box and one pebble. Faces: GLITCH static → STILL.
- **Science:**
  - Cognitive offloading (Risko & Gilbert 2016).
  - Making a concrete plan stops unfinished-goal intrusions (Masicampo & Baumeister 2011).
  - Implementation intentions (Gollwitzer 1999).
  - Scheduled postponement (Borkovec 1983).
- **Win:** ≤6 swipes or taps + 2 chips ≈ **20-30 s**.
- **Build (~300 lines):**
  - Blocks are `motion.div drag="x"`. `onDragEnd` reads `offset.x`/`velocity.x` (thresholds 90 px or 500 px/s), and a tap is a pointerup with < 8 px movement.
  - `data-eos-target`: the current block (`g="swipe"`, `dir="lr"`, label `← LATER · LET GO →`) → chips (`g="choose"`).

### F.11 Build order for new games (value ÷ effort)
1. **111 SIGH SURFER**: panic and the high band of 5 emotions all start here.
2. **112 LET OFF STEAM**: the mandatory anger act 2.
3. **115 PATCH UP**: shame has no good game today.
4. **117 LANTERN SKY**: loneliness has zero games today.
5. **118 COLOUR RUSH**: numbness has no up-regulation game.
6. **113 GROUND CONTROL**
7. **116 SHADOW SHRINK**
8. **114 BROKEN RECORD**
9. **120 ONE THING**
10. **119 YOUR SPOTLIGHT**

---------------------------------------------------------------------------------------------------
## G. Healthy-addiction and virality loop

### G.1 The loop, made ethical
| Hook stage | ThinkStill version | guardrail |
|---|---|---|
| **Trigger** (internal) | the feeling itself; the home screen *is* "What's loudest right now?" | **no push notifications, no guilt copy, ever** (Framer can't push anyway; keep it that way if this ships as an app) |
| **Action** | 3 taps, ≤5 s, then a game whose arrow teaches it in 1 s | "just let me play" skip always visible |
| **Reward** | real relief (Δ) + juicy finish + a Memory Orb whose expression you don't know yet (variable, cosmetic) | rewards are cosmetic, never paid, never expire; the ritual is paid, not the size of Δ |
| **Investment** | Memory Shelf, mastery ranks, personal "what works for me" map (router learns your best games) | data stays local; one-tap "reset my history" |

### G.2 Daily ritual: "Emotional Weather"
- The first loop of the day is a **Weather Check**, offered even on good days (`GOOD` → COLOUR RUSH savour mode). This trains the habit when calm, so it's automatic when panicked.
- **Calm Days** header chip shows `☀ 5/7`: a rolling count of days with a loop in the last 7. **No streak to lose**: a missed day only drops one sun off the left edge. Milestones (3/7, 7/7, 30 total days) grant a gold Core Memory orb.
- First loop of each day: **"Expression of the Day"**, a guaranteed new face for the emotion's character.

### G.3 Collection and mastery
- **Memory Shelf** (`EosMemoryShelf`, opened from the `◉ 23` header chip):
  - Layout: 7 glowing shelves, one per character, with 100 slots each (the real asset count is 7 × 100 webp, `expressions_manifest.json`). Owned orbs glow; missing ones are soft silhouettes.
  - Orb rarity is shown by rim: common, rare (glow) and gold (Core Memory).
  - Tapping an orb replays its moment: "PANIC 8 → 3 · Tue 9:41 · SIGH SURFER".
- **Mastery ranks per emotion**: Rookie → Steady → Pilot → Master (1/5/15/40 completed loops). Ranks unlock **cosmetics only**:
  - game skins (SIGH SURFER ocean / space, kettle colours)
  - character idle dances on the check-in
  - core colours
  
  Relief is never gated behind progression.
- **Mastery copy teaches the skill name:** "Panic Pilot · you know the double-sip sigh". Users learn the technique, so they can use it *without* the app. That's the long-term win.

### G.4 Share moment ("I shifted ANGER 8 → 2 in 41s")
- **`eosMakeShareCard(data)`**:
  - Canvas 1080×1350 (feed) or 1080×1920 (story), background gradient from emotion hue to calm cyan, with the Pixar-style vignette.
  - The big character orb animates from negative to positive face (two faces side by side with an arrow).
  - Text:
    - **`ANGER 8 → 2`** (Baloo 2, 140 px)
    - `in 41 s · LET OFF STEAM`
    - rank badge
    - small `thinkstill` wordmark
  - Images come from `raw.githubusercontent.com`, which sends `Access-Control-Allow-Origin: *`, so set `img.crossOrigin = "anonymous"` and the canvas stays untainted. If the image load fails, draw a coloured orb.
  - Fonts: wait for `document.fonts.load('900 140px "Baloo 2"')` before drawing.
- **Privacy default:** the card **never** includes the user's words. The `shareWords` pref is opt-in, and even then is blocked while the safety flag is set.
- **Share path:**
  1. `navigator.canShare({ files: [file] })` → `navigator.share({ files, text })`
  2. else download the PNG and copy the caption.
  
  Caption: `Went from 8 → 2 on anger in 41 seconds 🫧 #ThinkStillShift`.
- **Challenge link (no backend):** `?eos=panic&t=31`. `useEosSession` reads `location.search` on mount and pre-selects that emotion, with the banner "A friend calmed a panic in 31 s. Your turn?". The friend's time is shown, not compared competitively.
- **Weekly "Emotional Weather" recap card:** a donut of the week's emotions in character colours, plus "you shifted 9 times, average −3.4". This is the Wrapped-style identity share.

### G.5 Sound and haptic signature (consistent, brandable)
- **Per-emotion finish chord** (Web Audio, 3 notes): anger resolves minor → major, panic does a slow descending fifth, sadness rises a sixth. Users learn "the calm sound".
- **Haptics:**
  - touch: `vibrate(8)`
  - success: `[12, 40, 18]`
  - finish: `[20, 60, 20, 60, 40]`
  - exhale end: `[10, 60, 10, 60, 10]`
- All sound and haptics respect the existing `sound` toggle and the `hapticsOn` prop.

### G.6 Anti-dark-pattern rules (non-negotiable, enforced in code review)
1. Every reveal has a **`DONE FOR NOW ✓`** button as large as `ONE MORE`.
2. After **3 loops in a session or 10 minutes**, the reveal swaps its headline for *"You've shifted 3 times — nice. Take the calm with you?"*. The primary becomes DONE; ONE MORE stays available but secondary. Nothing is blocked.
3. No loss aversion: no expiring rewards, no breakable streaks, no "your orb will fade", no countdown offers.
4. No social pressure: challenge links show a friend's time, never a leaderboard, and never "X is ahead of you".
5. Variable rewards are cosmetic, free and capped (max 5 orbs/day; after that loops still pay ⚡ and Calm Days).
6. Never celebrate a negative Δ, never shame a zero Δ, never imply the user failed.
7. No fake data ("1,284 people are calming down with you right now" is forbidden without a real backend).

### G.7 What to measure (all local, optional opt-in export later)
- North star: **% of loops with Δ ≥ 2 within 60 s** (target ≥ 60 %).
- Median time-to-relief.
- Check-in completion rate (target ≥ 85 % of sessions).
- Arrow-assisted first-success time (target ≤ 3 s).
- Act-2 acceptance.
- D1/D7 return.
- Share rate per loop.
- % sessions ended with DONE (healthy exits, which should be high).

---------------------------------------------------------------------------------------------------
## H. Safety card (non-clinical, non-blocking)

### H.1 Triggers (`EosSafetyScan(text)` in `01_detect.jsx`, runs on `raw`, debounced 400 ms; never stored)
```js
const EOS_SAFETY = {
  selfharm: /\b(kill(ing)?\s*my\s*self|suicid\w*|end\s+(it\s+all|my\s+life)|take\s+my\s+(own\s+)?life|(want|wanna|wanted)\s+to\s+die|better\s+off\s+(dead|without\s+me)|no\s+reason\s+to\s+(live|be\s+here)|don'?t\s+want\s+to\s+(be\s+here|live|exist|wake\s+up)|self[-\s]?harm\w*|hurt(ing)?\s+my\s*self|cut(ting)?\s+my\s*self|overdos\w*)\b/i,
  abuse: /\b((he|she|they|my\s+(dad|father|mum|mom|mother|step\w*|partner|husband|wife|boyfriend|girlfriend|bf|gf|boss))\s+(hits?|beats?|chokes?|hurts?|threatens?)\s+me|being\s+(abused|hit|beaten)|abus(e|es|ing)\s+me|rap(e|ed)\b|sexual(ly)?\s+assault\w*|(not|don'?t\s+feel)\s+safe\s+at\s+home|scared\s+to\s+go\s+home)\b/i,
}
```
First-person phrasing keeps false positives low ("this traffic is killing me" doesn't match). False positives are cheap anyway, because the card is gentle and dismissible.

### H.2 Behaviour
- **Display:** the card slides up inside `.releaseStage` (z 70, above the arrows). It shows **any stage**, and the game underneath keeps running; it never blocks.
- **Routing while flagged** (`EOS_STORE.safety`): only `EOS_GENTLE_IDS` (§E.2). Destruction games are excluded, as is 114 (it repeats words). The reveal suppresses confetti, "DESTROYED/SMASHED" copy and the share card.
- **Repeated high distress:** if the after-rating is ≥ 8 for panic, sad, fear, lonely or shame in **3 loops within 24 h**, or after an Act 2, the **soft variant** shows: *"Big feelings keep coming back? Talking to someone can really help."* It has the same buttons, without the urgent header.
- **85 CONTROL PANEL "ASK HELP":** opens the soft variant.

### H.3 Card copy and markup (`EosSafetyCard`)
```
┌──────────────────────────────────────────────────────────┐
│  (STILL, soft face)   You deserve real support right now. │   18 px
│  You don't have to carry this alone — talking to a person │   15 px
│  can help more than any game.                             │
│  [ TALK TO SOMEONE NOW ]  (expands the list below)        │   primary
│  US · 988   UK & IE · 116 123   AU · 13 11 14             │   tel: links, 15 px
│  IN · 14416 (Tele-MANAS)   Anywhere · findahelpline.com   │
│  In immediate danger? Call your local emergency number.   │
│  [ I'm safe — keep playing ]                              │   secondary, equal size
└──────────────────────────────────────────────────────────┘
```
- The abuse variant title reads *"If someone is hurting you, you deserve to be safe."* and the list shows domestic-violence lines (placeholders, configured the same way).
- Lines are **configurable placeholders**: a new Pixar property control `crisisLines` (string, `label · number` separated by `|`) and `emergencyText` (edit X1/X2). The defaults above are real services, but **the owner must verify them per region before shipping.**
- **A11y:** `role="alertdialog"`, `aria-live="assertive"` on first show, focus moves to the primary button, Escape = "I'm safe".

### H.4 Always-on, non-clinical framing
A footer line on the Memory Shelf and in About reads: *"ThinkStill is a playful tool for everyday feelings — not therapy, diagnosis or a crisis service."* It is never shown mid-game.

---------------------------------------------------------------------------------------------------
## I. Build plan

### I.1 Modules (`src/eos/`, concatenated in filename order after `00_arcade.jsx`; no imports; every top-level name prefixed `Eos`/`EOS_`/`eos`)
| file | top-level identifiers | depends on (at call time) | contract |
|---|---|---|---|
| `00_core.jsx` | `EOS_A`, `EOS_PX`, `EOS_KEYS`, `eosGet(k,d)`, `eosSet(k,v)`, `EOS_STORE {get,set,subscribe}`, `EOS_EMOTIONS`, `EOS_EMO` (by id), `EOS_ENGINES`, `EosEngineFor(game)`, `EOS_CSS_PARTS`, `EOS_LAB_IDS`, `EOS_GENTLE_IDS`, `eosWords(entries,n)`, `eosFace(char,phase,k)`, `eosEaseInOut`, `eosCoreBoost(v)`, `EosAudio()` | arcade: `displayText`, `emotionSrc`, `RELEASE_PHASE_EMOTIONS`, `isImageOnlyEntries` | pure data and helpers; nothing React at top level; **contract freeze #1** |
| `01_detect.jsx` | `EOS_LEXICON`, `EOS_SAFETY`, `EosDetectEmotion(text)` → `{id, score, intensity}`, `EosSafetyScan(text)` → `null\|"selfharm"\|"abuse"`, `EosEntries(raw)` (E17), `EosProfileOverride(input)` (E18) | 00, arcade `tokeniseWords`, `RELEASE_INPUT_EMOTION_PROFILES` | pure |
| `02_css.jsx` | `EOS_CSS_TYPE`, `EOS_CSS_HUD`, `EOS_CSS_DOTS`, `EOS_CSS_FIXES`, `EosGlobalStyle()` | 00 | `EosGlobalStyle` renders `<style>{EOS_CSS_PARTS.join("\n")}</style>`. Each module pushes its CSS string at top level, so ordering is safe because it's read at render |
| `03_stubs.jsx` | temporary no-op versions of every component/function referenced by the arcade edits | — | a module owner deletes their stubs in the same commit that lands the real module (duplicate top-level names are a module SyntaxError) |
| `10_session.jsx` | `useEosSession({sound,stage,selected})`, `EosCommit`, `EosReset`, `EosMarkLaunch(game,entries)`, `EosMarkFinish(game,bonus)`, `EosRate(after)`, `EosRoundBonus()`, `eosHistory()`, `eosPersonalDelta(emo,id)`, `eosRecentGameIds(n)`, `eosSeen(id)`, `eosMarkSeen(id)`, `EosConfigSync(props)` | 00, 01 | `useSyncExternalStore`; mirrors `sound` and `stage`; parses `?eos=&t=` |
| `20_checkin.jsx` | `EosCheckIn`, `EosIntensityDial`, `EosEmotionOrb` | 00, 10, 30 | props `{eos, raw, setRaw, onGo, onMic, listening, sfx, reduced}`; must not cover `.releaseComposer` |
| `30_router.jsx` | `EOS_ROUTES`, `EOS_SECOND_ACT`, `EOS_HINT_FIX` (+ `Object.assign(SHORT_HINT, EOS_HINT_FIX)`), `EosRouteGame(text,played,excludeId)`, `EosSecondAct(emo,lastId,delta)`, `EosMenuGroup` | 00, 01, 10 | returns a `GAMES` object or `null` (the caller falls back to `chooseRelevantGame`) |
| `40_arrows.jsx` | `EOS_GESTURES`, `EosGestureFor(game)` → `{stages, glyph}`, `EosGuideArrows`, `EOS_CSS_ARROWS` | 00, 10 | props `{game, hostRef, reduced}`; DOM read-only; `pointer-events:none` |
| `50_stage_layer.jsx` | `EosStageLayer`, `EosDotField`, `EosCore`, `EosPlayHud` | 00, 10, 40, 70 | props `{stage, game, hostRef, reduced, raw, gameKey}`; renders z 1 (dots, core) and z 60-70 (arrows, HUD, safety) inside `.releaseStage` |
| `60_reveal.jsx` | `EosShiftMeter`, `eosMakeShareCard(data)` → `Promise<Blob>`, `EosShareButton` | 00, 10, 30, 65 | props `{game, sfx, reduced, onAgain, onPlay, onNewThought}` |
| `65_rewards.jsx` | `EosHeaderChips`, `EosMemoryShelf`, `eosGrantOrb(emo,delta)`, `eosDays()`, `eosRank(emo)` | 00, 10 | — |
| `70_safety.jsx` | `EosSafetyCard({text})`, `EOS_CRISIS_DEFAULT` | 00, 01, 10 | reads `EOS_STORE.get().crisisLines` |
| `90_game_111_sigh.jsx` … `99_game_120_onething.jsx` | `GAMES.push(...)`, `EOS_ENGINES[id] = Eos<Name>`, `function Eos<Name>` | 00 | engine contract §F.0 |
**TDZ rule:** eos files run before `99_pixar.jsx`, so they must never touch `PX_B`, `pxNoise` or `PIXAR_CSS` at top level (`map_main` header). Function declarations hoist; `const` does not.

### I.2 Phases (each phase ships on its own; work packages inside a phase can go to separate agents)
| phase | goal visible to the user | modules | arcade edits | done when |
|---|---|---|---|---|
| **P0** "see it, read it" | arrows in every game; readable HUD/words; dots converge; bar never goes backwards | 00, 02, 03, 40, 50 (field, core, arrows; HUD optional) | E9, E10, E13, E14, E15 (E16 optional) | `eos_arrows.mjs` + `eos_type.mjs` + `eos_dots.mjs` pass on 110 games at 1280 and 390 |
| **P1** "name it → right game" | check-in, intensity, auto-detect, emotion routing, safety | 01, 10, 20, 30, 70 | E1-E6, E17, E18, (E19), X1, X2 | `eos_flow.mjs`: pick ANGRY·8 → game id ∈ routes.anger.high → plays |
| **P2** "feel it shift" | before/after meter, Memory Orbs, ⚡ pour, header chips, share card | 50 (`EosPlayHud`), 60, 65 | E7, E7b, E8, E11 | meter shows `8 → 3`, an orb is granted, the share PNG is produced |
| **P3** new games batch 1 | 111, 112, 115, 117, 118 | 90-94 | E12 (once) | each game finishes ≤45 s in the harness; arrows from `data-eos-*` |
| **P4** batch 2 + LAB fixes | 113, 114, 116, 119, 120; legacy fixes listed in §E.3 (PRESSURE POP window, BIN radius, SHRED taps, any-order sequences, CLEANSE lock…) | 95-99 + small per-game edits | per-fix anchors (find with `grep -n "case 11:"` etc. in `UniqueReleaseEngineLegacy` L15077) | promoted ids removed from `EOS_LAB_IDS` |
**Integration tactic:** commit 0 lands **all P0-P3 arcade edits at once**, together with `00_core.jsx`, `02_css.jsx` and `03_stubs.jsx` (stubs return `null`/no-op). Every later module is then a pure add-file + delete-stub change, with no merge conflicts in the 22 k-line file.

### I.3 Surgical edits to `src/00_arcade.jsx` (string replacement; counts verified on the baseline)
| # | phase | anchor (exact, leading spaces matter) | count | change |
|---|---|---|---|---|
| E1 | P1 | `    const [releaseCheck, setReleaseCheck] = React.useState(null)` | 1 | append line `    const eos = useEosSession({ sound, stage, selected })` |
| E2 | P1 | `                    {stage === "input" && !selected ? (` | 1 | insert **before**: `{stage === "input" && !selected ? (<EosCheckIn eos={eos} raw={raw} setRaw={setRaw} onGo={startThinkStillChoice} onMic={toggleMic} listening={listening} sfx={sfx} reduced={!!reduced} />) : null}` |
| E3 | P1 | `    const clearForNext = React.useCallback(() => {` | 1 | append line `        EosReset()` |
| E4 | P1 | `        const best = chooseRelevantGame(sourceThought)` | 1 | `        const best = EosRouteGame(sourceThought, played) \|\| chooseRelevantGame(sourceThought)` |
| E5 | P1 | `        return chooseRelevantGame(sourceThought, selected.id, selected)` | 1 | `        return EosRouteGame(sourceThought, played, selected.id) \|\| chooseRelevantGame(sourceThought, selected.id, selected)` |
| E6 | P1 | `            setVariationSeed((v) => v + 1)` + `\n            setStage("play")` | 1 | insert `            EosMarkLaunch(g, e)` between the two lines |
| E7 | P2 | `            setReleaseCheck(null)` + `\n            setStage("reveal")` | 1 | insert `            EosMarkFinish(selected, bonus)` before them |
| E7b | P2 | `                100 + bonus + Math.min(180, entries.join(" ").length * 2)` | 1 | append ` + EosRoundBonus()` |
| E8 | P2 | `                                    <div className="releaseShiftCheck">` | 1 | insert before: `<EosShiftMeter game={selected} sfx={sfx} reduced={!!reduced} onAgain={replay} onPlay={startChosenGame} onNewThought={clearForNext} />` |
| E9 | P0 | `                    {stage === "reveal" && selected ? (` | 1 | insert before: ``<EosStageLayer stage={stage} game={selected} hostRef={gameHostRef} reduced={!!reduced} raw={raw} gameKey={selected ? `${selected.id}-${variationSeed}-${materialRevision}` : "idle"} />`` |
| E10 | P0 | `            </style>` + `\n\n            <div className="ambient a1" />` | 1 | insert `            <EosGlobalStyle />` after `</style>` |
| E11 | P2 | `                    <button` + ``\n                        className={`releaseHeaderSound ${sound ? "active" : ""}`}`` | 1 | insert `<EosHeaderChips />` before |
| E12 | P3 | `    if (!UNIQUE_HERO_IDS.has(p.game.id)) return <UniqueReleaseEngine {...p} />` | 1 | prepend `    { const E = EosEngineFor(p.game); if (E) return <E {...p} /> }` |
| E13a | P0 | legacy guide card: ``                        key={`guide-${p.game.id}-${guideText}`}`` … `                        <small>{guideParts.label}</small>` (4-line block, `map_engine_hud` §2.4) | 1 | insert `<i className="guideActionArrow" aria-hidden="true">{EosGestureFor(p.game).glyph}</i>` before `<small>` |
| E13b | P0 | `                        {Number(p.game?.id \|\| 0) < 100 ? (` | 1 | `                        {true ? (` |
| E13c | P0 | `{guideGesture.arrow \|\| "↑"}` | 1 | `{EosGestureFor(p.game).glyph \|\| guideGesture.arrow \|\| "↑"}` |
| E14a | P0 | `        onProgress: reportProgress,` | **2** (replace all) | `        onProgress: (v, l) => { if (v > 0) progressRef.own = true; reportProgress(v > 0 ? Math.max(v, progressRef.current) : v, l) },` |
| E14b | P0 | `        if (!explicit) {` + `\n            const next = pct(progressRef.current + gameProgressStep(p.game))` | **2** (replace all) | `        if (!explicit && !progressRef.own) {` (rest unchanged) |
| E15 | P0 | `    const engineBubbleTextPx = Math.max(` + `\n        1,` | **2** (replace all) | `\n        15,` |
| E16 | P0 opt | `        bubbleTextPx = 4,` (8-space indent, main props) and `        title: "Bubble Text",\n        min: 1,\n        max: 18,\n        step: 0.5,\n        defaultValue: 4,` | 1 + 1 | `= 16`; `max: 28`, `defaultValue: 16` |
| E17 | P1 opt | `function cleanEntries(raw) {` | 1 | append line `    { const eosE = EosEntries(raw); if (eosE) return eosE }`. Short inputs (<6 tokens) become 2-3 phrase chunks plus the emotion's seed feeling-words instead of "I / am / … / I"; returns `null` (original behaviour) for ≥6 tokens, image-only input, or no known emotion |
| E18 | P1 opt | `function releaseEmotionProfile(input) {` | 1 | append line `    { const o = EosProfileOverride(input); if (o) return o }`, so in-game copy and spark names follow the checked-in emotion |
| E19 | P1 opt | `                                <div className="releaseChoiceGroupLabel">` + `\n                                    15 SIGNATURE RELEASES` | 1 | insert `<EosMenuGroup played={played} onPick={startChosenGame} />` before (items are `button.releaseChoiceItem` so `drive.mjs` keeps working) |
| X1 | P1 | 99_pixar: `            <ThinkStillReleaseArcade {...arcadeProps} />` | 1 | insert before: `            <EosConfigSync crisisLines={props.crisisLines} emergencyText={props.emergencyText} />` |
| X2 | P1 | 99_pixar: `    pixarDust: {` | 1 | insert before: `crisisLines` (String, textarea) and `emergencyText` (String) controls with the §H.3 defaults |
| X3 | P0 opt | 99_pixar: ``                            top: `${40 + pxNoise(i, 23) * 60}%`,`` | 1 | ``top: `${pxNoise(i, 23) * 100}%`,`` (motes spawn over the full height) |
**Not edited on purpose:**
- `dynamicBubbleTextCss` (fixing it would shrink words to 4 px).
- `usesExplicitProgress` (new games use engine `E04`).
- `SHORT_HINT` / `RELEASE_MIND_BEND` (mutated from eos modules).
- The stage machine (no new stage value; the check-in is an overlay).
- The menu markup, so drive.mjs keeps `input.releaseThoughtInput`, `button.releaseChoiceButton` and `button.releaseChoiceItem`, with "LET THINKSTILL CHOOSE" first.

### I.4 Contracts in one place
- **Store API:**
  - `EOS_STORE.get()` returns the D.7 shape.
  - `EOS_STORE.set(patch)` merges, then notifies subscribers.
  - Session functions are idempotent: calling `EosMarkFinish` twice in one launch is ignored, keyed by `launchAt`.
- **Overlay ↔ game:** read-only DOM. The signals are `.engineProgressTrack[aria-valuenow]`, `.globalPlayGuide.isActive/.isComplete/.guideHit`, `.tsRewardSurge.mega` and `[data-eos-target]`. The overlay never mounts inside `.cinematicContentShell`, because the wrapper MutationObservers and collision solver would react to it (`map_engine_hud` §6).
- **New engine:** §F.0.
- **Router:** `EosRouteGame` returns a `GAMES` object or `null`. It never throws, it skips ids not in `GAMES`, and it skips `EOS_LAB_IDS`.

### I.5 Verification (Playwright harness; add scripts beside `dev/drive.mjs`; run after `python3 build.py`)
| script | asserts |
|---|---|
| `dev/eos_arrows.mjs` | For each of the 110 (+ new) games at 1280×860 and 390×844:<br>• within 2.0 s `.eosArrowLayer .eosArrow` exists (except `own:true` games, which must show after 4 s idle)<br>• the orb centre lies inside the target rect (±8 px), or inside the group bbox for `choose`<br>• the label font-size is ≥ 14 px<br>• after performing the real interaction from `audit_*.json` (`realMechanic` / `fallback`), `aria-valuenow` rises and the arrow hides within 200 ms<br>• the misses list is empty |
| `dev/eos_type.mjs` | Across `.tsArcade`:<br>• no visible text node with rendered size < 12 px<br>• user-word selectors are ≥ 15 px<br>• no `scrollWidth > clientWidth + 2` on resized nodes<br>• `.engineProgressHud` stays inside the viewport at 390 |
| `dev/eos_dots.mjs` | • `.tsPxDust` and `.cinemaDust i` computed `animation-name` includes `eosMergeX`<br>• sampled at t and t + 3 s, ≥ 70 % of dots move closer to the stage centre<br>• with `reducedMotion: "reduce"`, animation is `none` |
| `dev/eos_flow.mjs` | Check-in → ANGRY → 8 → SHIFT IT → `.stage-play`, with the game id in `EOS_ROUTES.anger.high`, then:<br>• force `onDone` via the real interaction<br>• the reveal shows `.eosShiftMeter`; tap 3 → headline `ANGER 8 → 3`<br>• `localStorage['eos:v1:history']` has 1 entry and contains **no user text**<br>• the "just let me play" path still works with the existing `startGame(page, "POP", text)` |
| `dev/eos_safety.mjs` | Typing "i want to die" shows `.eosSafetyCard[role=alertdialog]` while the game still runs, and the routed id ∈ `EOS_GENTLE_IDS`; typing "this traffic is killing me" shows no card |
| regression | `node drive.mjs "POP" shots/x.png 1280 860` and the three existing audits still run; no new console errors other than the pre-existing "Cannot update a component while rendering" warnings (CRACK, BURN, VACUUM, VOLUME KNOB) |

### I.6 Risks and mitigations
| risk | mitigation |
|---|---|
| A selector in `EOS_GESTURES` is stale or state-dependent (`// verify` rows) | `eos_arrows.mjs` names every miss; the fallback chain still shows a sensible arrow; `data-eos-target` can be added to any game later |
| The overlay's rAF costs battery | throttled measuring (20 Hz visible / 4 Hz hidden); stops at completion; one element measured per tick |
| `left/top` dot animation causes layout | 52 tiny absolutely-positioned nodes = negligible; reduced-motion turns it off; optional per-dot `translate` with container units (`container-type:size` + `cqw`) if profiling ever shows cost |
| Check-in feels like homework | 3 taps, skippable, intensity pre-set to 6, "just let me play" always visible; measure completion ≥ 85 % |
| Users rate dishonestly to farm rewards | XP pays for the ritual, not the Δ (§D.6) |
| Seed words (E17) feel like putting words in the user's mouth | they're shown in the composer and editable; the pref `enrich:false` disables them |
| Crisis numbers are wrong for a region | they're property-control placeholders; the owner verifies them before publishing (§H.3) |

---------------------------------------------------------------------------------------------------
## References (for the science claims above)
- Balban MY et al. (2023). Brief structured respiration practices enhance mood and reduce physiological arousal. *Cell Reports Medicine* 4(1).
- Lehrer PM, Gevirtz R (2014). Heart rate variability biofeedback: how and why does it work? *Frontiers in Psychology* 5:756. · Zaccaro A et al. (2018). How breath-control can change your life. *Frontiers in Human Neuroscience* 12:353.
- Kjærvik SL, Bushman BJ (2024). A meta-analytic review of anger management activities that increase or decrease arousal. *Clinical Psychology Review* 109. · Bushman BJ (2002). Does venting anger feed or extinguish the flame? *Personality and Social Psychology Bulletin* 28(6).
- Lieberman MD et al. (2007). Putting feelings into words: affect labeling disrupts amygdala activity. *Psychological Science* 18(5).
- Masuda A, Hayes SC, Sackett CF, Twohig MP (2004). Cognitive defusion and self-relevant negative thoughts. *Behaviour Research and Therapy* 42(4).
- Kross E et al. (2014). Self-talk as a regulatory mechanism. *JPSP* 106(2). · Grossmann I, Kross E (2014). Exploring Solomon's paradox. *Psychological Science* 25(8). · Bruehlman-Senecal E, Ayduk Ö (2015). This too shall pass: temporal distance and the regulation of emotional distress. *JPSP* 108(2).
- Neff KD (2003). Self-compassion. *Self and Identity* 2(2). · Ferrari M et al. (2019). Self-compassion interventions and psychosocial outcomes: a meta-analysis of RCTs. *Mindfulness* 10. · Dreisoerner A et al. (2021). Self-soothing touch and being hugged reduce cortisol responses to stress. *Comprehensive Psychoneuroendocrinology* 8.
- Craske MG et al. (2014). Maximizing exposure therapy: an inhibitory learning approach. *Behaviour Research and Therapy* 58.
- Curry OS et al. (2018). Happy to help? Acts of kindness and well-being: a meta-analysis. *J Exp Soc Psych* 76. · Epley N, Schroeder J (2014). Mistakenly seeking solitude. *JEP: General* 143(5). · Kumar A, Epley N (2018). Undervaluing gratitude. *Psychological Science* 29(9).
- Emmons RA, McCullough ME (2003). Counting blessings versus burdens. *JPSP* 84(2). · Seligman MEP et al. (2005). Positive psychology progress. *American Psychologist* 60(5). · Cohen GL, Sherman DK (2014). The psychology of change: self-affirmation. *Annual Review of Psychology* 65.
- Risko EF, Gilbert SJ (2016). Cognitive offloading. *Trends in Cognitive Sciences* 20(9). · Masicampo EJ, Baumeister RF (2011). Consider it done! *JPSP* 101(4). · Gollwitzer PM (1999). Implementation intentions. *American Psychologist* 54(7). · Borkovec TD et al. (1983). Stimulus control applications to the treatment of worry. *Behaviour Research and Therapy* 21(3).
- Gross JJ (1998). The emerging field of emotion regulation. *Review of General Psychology* 2(3). · Samson AC, Gross JJ (2012). Humour as emotion regulation. *Cognition & Emotion* 26(2).
- Dimidjian S et al. (2011). The origins and current status of behavioral activation treatments for depression. *Annual Review of Clinical Psychology* 7. · Salimpoor VN et al. (2011). Anatomically distinct dopamine release during anticipation and experience of peak emotion to music. *Nature Neuroscience* 14(2).
