# Pilot A creative critique (Pixar story artist + premium mobile game designer)

**Reviewed:** `docs/pilot/PILOT_A_SPEC.md` v1 (2026-10-09), against `docs/CREATIVE_STANDARDS.md` and today's contact sheets `dev/shots/quality/sheets/{1,109,2}.png`.
**Built code:** none yet. `src/pilot/` does not exist. This critique covers the blueprint, so the findings can be fixed before anyone builds.
**Verified in code for this review:**
- The engine unmounts at the reveal. `stage === "play"` mounts it (00_arcade L22095), and `stage === "reveal"` renders `.releaseCompleteOverlay` in its place (L22124). That overlay is `rgba(0,5,10,.76)` with a blur, drawn over the generic nebula (L21055).
- Each character has 64 expressions (`bubble-expressions/<char>_E01..E64`, from `thinkstill_750_expression_map.json`). S1 uses only 4 of them.

Fix IDs (`CR-…`) are for the lead's tracking. P0 items block "premium ≥ 8". P1 items are per-game story and gameplay fixes. P2 items are polish.

---

## Verdict

**The three worlds and mechanics are genuinely different:**
- POP: tap-release on tethered soap film.
- CLEANSE: hold-and-breathe on glass orbs.
- CRUSH: rhythm slams in a hydraulic press.

The direct-manipulation fixes (the object is the target) are the right call. So are the monotonic progress plan, the `onDone` fix and the performance discipline.

**What still reads as a template is everything after the climax.** All three finales end the same way: a grade to sunrise, a hop wave, the generic jump-spin, then a tableau. That tableau is then wiped by a dark reveal screen.

**The characters are promised more acting than the rig can deliver.** The storyboards call for hands, a tongue, eyes opening and turning. The actor is a face image in a ball with 4 faces, and it plays the same reaction on every input.

**On a phone, the shared chrome owns the thumb zone,** so every target sits in the stretch or hard zone.

**Three story beats work against the emotion:**
- POP bursts its own calm symbol at the end.
- CRUSH's reactions read as injuring your own feeling, and its biggest hit is automatic.
- CLEANSE's 850 ms "inhale" paces breathing at about 26 breaths per minute in a panic-first game.

**Projected scores** (from the spec, phone first; these are projections, not ratings):

| Game | As written | With the P0 and P1 fixes |
|---|---|---|
| POP | ~6-7 on D/E/G | ≥ 8 is reachable |
| CLEANSE | ~6 on D/G/H, 7 on B | ≥ 8 is reachable |
| CRUSH | ~5-6 on D/E/H | ≥ 8 is reachable |

## The five questions, briefly

1. **Is each game a genuinely different, delightful scene?** The scenes are different. The delight is thin: there are no surprises or gags, every reaction repeats, and the endings converge (CR-1).
   - POP and CLEANSE share a silhouette: six translucent spheres with a word each, around one character. CR-9 breaks it.
2. **Do the characters act (anticipation, reaction, transformation) on every input?** Anticipation and squash are in place. The reactions are one fixed clip per input type (CR-4), and the supporting cast is idle (CR-5).
   - POP's `hit` recoil reads as the pop hurting the hero.
   - CRUSH's flinch → dizzy → cracks reads as injury (CR-12).
3. **Is each finale spectacular, specific to its mechanic and resolving within ~5 s?** The climaxes are specific and good: droplets merge, the pool turns to a mirror while the lotus opens, the embers become a cube. The payoff halves are a shared sunrise grade plus a hop wave (CR-1).
   - The peaks miss the wrapper's win × 3 (CR-2).
   - A reflexive tap skips the climax (CR-6).
   - The world vanishes at the reveal (CR-2).
4. **Is the phone layout thumb-friendly?** No. The LIVE GUIDE (viewport y ≈ 593-717) and the input bar (≈ 740-780) occupy the natural thumb zone, so all targets sit at y ≈ 150-450 (CR-3).
5. **Does anything feel like a template or like therapy homework?** Yes:
   - the shared finale grammar (CR-1);
   - six "HOLD TO …" captions at once, plus guide text, on CLEANSE (CR-11);
   - arcade "+STILL HIT · CHAIN" toasts on a breathing game (CR-11);
   - destroy targets labelled "I" and "feel" (CR-7).

---

## P0: fix in the spec before building

### CR-1 · The three finales converge on one ending. Give each its own light and its own celebration.

**Evidence:**
- POP ends with "the sky grades to golden morning".
- CLEANSE ends with "grade: dawn … the sun's rim rises".
- CRUSH ends with "sunrise god-rays come through the high windows".
- All three then run `grade(1,1600)`. CLEANSE and CRUSH both run "six characters hop in a wave", and all three heroes run the same S1 `finish` (crouch → jump → land → spin, wave or heart).
- QUALITY_REPORT §5 already plans sunrise or dawn finales for 41, 43, 11, 30, 64, 66, 18, 36, 75 and 77.
- The shared mood module already performs the loud → calm colour shift. A per-game grade to warm is exactly "the shared colour shift instead of a finale" (Standard 2).

**Fix:** sunrise is banned as a pilot resolution. Each game resolves through a different physical light source:

| Game | Resolution light | Celebration (its own choreography, not S1 `finish` with a different tail) |
|---|---|---|
| POP | **Sunlight refracting through the calm bubble.** A rainbow caustic sweeps across the cloud and the hero. The bubble film swirls with colour. | The hero settles cross-legged inside its bubble, gives a closed-eye smile and bobs gently. |
| CLEANSE | **The clearest night.** The water is mirror-still, the stars double in it, and a moon path is laid across the water to the lotus. The lotus's gold glow is the warm key light. | The session character and STILL touch foreheads (CR-10); the cleared orbs turn on their pads to watch. |
| CRUSH | **Warmth held in the hands.** The cube's core is caught by RUSH, and its light paints a warm under-light on every blob's face. | RUSH cradles the glow like a hand-warmer; the shelf blobs lean in to warm themselves. |

The `grade` beat becomes a supporting move of at most 40% opacity change. It is never a named shot.

**Acceptance:** the four finale frames (T0 + 0.3 / 0.9 / 1.8 / 3.0 s) of the three games, placed side by side, share no dominant hue and no repeated character pose.

### CR-2 · Land each game's peak on the hand-off, and do not let the world cut to black.

**Peak timing.** The wrapper plays win × 3 at T0 + 1300 / 1470 / 1640 ms (G5). That music sting is the moment of maximum attention.
- CRUSH aligns with it (the cube bursts at 1300).
- POP's payoff comes at 2600, so the sting lands on a "lift" in progress.
- CLEANSE's lotus is only half-open at 1300.

Re-time POP and CLEANSE so that each game's single biggest visual change lands at 1300 ± 60 ms. Use 1300-2600 as afterglow, under the shared bloom.

**Reveal cut.** Verified in code: the engine unmounts when `stage` becomes `"reveal"` (L22095 / L22124). The 2700-4300 tableau is therefore replaced by a dark overlay on the generic nebula. Sheets 1 and 2 (`390_reveal`) show a dark starfield and a card.
- The emotional arc currently ends with a cut from a warm world to a dark screen.
- Spec S6.5 ("compose the tableau clear of the centred card") rests on a false premise.

Fix:
- **(a)** Treat T0 + 4300 as the world's last frame. The tableau must reach its final composition by T0 + 2600 and hold it.
- **(b) Afterglow (owner or lead decision; it reaches outside `.eosPilotArena`, as the S6 toast dock already does):**
  - At the hand-off, the pilot sets `data-eos-pilot-afterglow="sky|pool|workshop"` and `--eos-pilot-afterglow-face: url(<hero win face>)` on the `.tsArcade` root.
  - Pilot CSS then paints `.releaseCompleteOverlay` with the kit's calm gradient instead of the 0.76 black.
  - It also shows the hero's win face as a 96 px circular image above the card. Bubble rules apply: no plate, and any text sits below.
  - Clear both on the next `stage === "play"`.
  - If this is refused, file it for W0-2 as the top item.

### CR-3 · The thumb zone belongs to the chrome. Dock the LIVE GUIDE during play and move the targets down.

**Evidence:** the phone play box is y ≈ 95-575 (S5). The spec's own layouts put:
- POP's top row at y ≈ 205 and its lower row at ≈ 310;
- CLEANSE's top arc at ≈ 153-167;
- CRUSH's press mouth at ≈ 335.

These sit in the stretch and hard reach zones of a 390 × 844 phone. Meanwhile the guide (≈ 593-717) and the input bar (≈ 740-780) occupy the comfortable zone. The play box is also only about 480 px tall.

**Fix:** add S6 item 6, "guide dock":
- While a pilot arena is in `phase === "play"`, scoped CSS (`.cinematicContentShell:has(> .arena.eosPilotArena) .globalPlayGuide`) collapses the guide to one strip of 40-44 px showing the "How to play" line.
- A tap expands the full card, including MIND BEND.
- Keep the element and its `.isComplete` class, so G8 and the arrows keep working.
- At the hand-off, show the MIND BEND line docked at the top for 2.5 s as the story's moral. That is a redesign, not a removal (Standard 7).

S5 re-measures the play box to ≈ y 95-680. Then re-lay out the phone (see CR-8, CR-9 and CR-14):
- target centres between 50% and 85% of the screen height (y ≈ 420-720);
- characters and goals above them.

**Acceptance:** at 390 × 844, every live target centre has y ≥ 400.

### CR-4 · Give the actors the faces and the variety that real acting needs.

**Evidence:** S1 has 4 faces (loud, soft, calm, win), plus squash and lean on a circle. The storyboards promise:
- POP: "raised hands", "presses a hand to the film", "waves";
- CRUSH: "sticks out its tongue";
- CLEANSE: "eyes opening", "turn to face the lotus".

None of that can be done with a face image inside a ball. Every pop plays the same `hit` → `exhale`, and every slam the same `hit`.

**Fix:**
- **(a) Reaction faces.** Add `EOS_PILOT_REACT_FACE[char] = { brace, wow, phew, giggle }`.
  - Pick them from the 64 expressions per character on one contact strip, in the same step as the soft faces (risk 1).
  - Hold each for 150-450 ms, then return to the step face.
  - Preload only the characters present in the game.
- **(b) Acting pool.** Each input type gets 3-4 variants, and the same variant never plays twice in a row. For a pop, for example:
  - a lurch away, then a look at the empty spot;
  - a shake-off;
  - a giggle at chain ≥ 3;
  - a closed-eye `phew` at a step crossing.
- **(c) Rig honesty.** Either rewrite the storyboard verbs to what the rig can do, or add a minimal rig part.
  - What the rig can do: lean, look (a face-image offset of ± 6 px toward the target), squash, hop, spin, swap face.
  - The rig part: two 18 px hand nubs (`i.hand`, in the character's hue, circular), used only by the holder and inside roles, so "raised hands", "hand on the film" and "wave" become real.

**Acceptance:** in the phone recording, no two consecutive inputs of the same type produce the same face-plus-motion pair.

### CR-5 · The supporting cast must react. Reaction shots sell the action.

**Evidence:**
- In CLEANSE's per-orb beat, the five other orbs and STILL do nothing during a hold or release.
- CRUSH's finished blobs are 28 px shelf decorations, too small to act.

**Fix:**
- **CLEANSE, sympathetic breathing:** the uncleansed orbs inhale at 30% amplitude with the held orb and exhale with it. Cleared orbs on their pads lean toward the active orb. STILL's bud glows faintly on each inhale.
- **CRUSH, the shelf as an audience:**
  - shelf blobs are 44 px;
  - they wince on a slam (3 frames);
  - they cheer on a heavy hit (one hop, the `wow` face);
  - on each splat, the newest arrival bumps its neighbour.
- These are CSS classes and a WAAPI animation on at most 6 nodes, within the P1 budget.

### CR-6 · A reflexive tap must not skip the climax.

**Evidence:** "a stage pointerdown before the hand-off skips". CRUSH is played as 24 rapid taps at a 180-320 ms cadence, and POP chains pops within 900 ms. The player's next tap, out of rhythm, lands within about 300 ms of T0 and erases the 1.3 s climax the whole game builds to. Skipping saves at most 1.3 of the 4.3 s, because the wrapper's 3 s hold cannot be skipped.

**Fix:**
- No skip before T0 + 800.
- After that, skip only on a tap at least 400 ms after the previous tap.
- Taps in the first 800 ms play along and are logged as `action:"finale-tap"`:
  - CRUSH: + 3 sparks;
  - POP: a glint on the calm bubble;
  - CLEANSE: one ripple.

### CR-7 · The user's words: never make a destroy target of "I" or "feel".

**Evidence:**
- Sheet 1 (`1_390_start`) shows bubbles labelled "I", "me and" and "feel".
- Sheet 109 shows orbs labelled "i", "feel" and "me and".
- Sheet 2's CRUSH tags include "feel".

Popping or crushing "I" or "feel" sends the wrong message in a wellbeing product, and fragments like these read as noise.

**Fix** in `eosPilotWords`:
- Merge any chunk made only of pronouns, function words or feeling verbs (`i, me, my, and, at, to, feel, am, is, so`) into its neighbour.
  - Example: "my boss / yelled at me / I feel panic" becomes "my boss / yelled at me / panic", with "I feel" joined onto the last chunk's tag.
- Every token still appears on some object (Standard 7).
- N may drop to 3-5, so every layout must be specified and tested for N = 3, 4, 5 and 6 (spec risk 6 covers only N > 6).

---

## P1: per game

### POP: "Balloon Morning"

**CR-8 · Fix the story physics: ground the hero and pop the pulls.**
- **Problem:** a bunch of balloons holding a character aloft reads as lift. Popping them should make it fall, which is scarier, not calmer. The spec's hero floats at (50%, 76%) with no ground. The `hit` recoil on each pop reads as the pop hurting the hero.
- **Fix:** the hero stands on a small sunlit cloud-top. The six bubbles pull it in different directions, like a child at a fair yanked by a bunch of balloons in the wind: anxiety is being pulled every way.
- **Each pop:**
  - the tether snaps;
  - the hero lurches away from the popped side (pendulum, 300 ms) and its feet resettle;
  - its stance widens step by step with progress (grounding, a real anxiety skill).
- `setTug` keeps its role. `hit` is replaced by `lurch(dir)`.
- **Phone layout after CR-3:**
  - hero on the cloud at ≈ 85% of the box (y ≈ 590);
  - honeycomb centres at 42-62% (y ≈ 340-460);
  - sizes vary with word length, and tether lengths vary (no six identical spheres, as on sheet 1 today);
  - the marked bubble pulls hardest (largest sway), so the arrow and the story agree.

**CR-9 · Fix the finale's meaning: keep the calm bubble and cut the lift-off and the burst.**
- **Keep:** the merge of droplets → one calm bubble that grows around the hero. "From six pulls to one space of your own" is the best idea in the pilot.
- **Cut the lift-off.** It would be the fifth rise-to-sky ending (33 FLOAT AWAY, 41 UNHOOK, 114 SKY LANTERNS, 36 CLOUD PASS).
- **Cut the 2600 burst.** It destroys the calm symbol the player just earned.
- **New timing:**
  - **T0 + 1300**, on win × 3: the bubble catches the sun, and a rainbow caustic sweeps across the cloud and the hero (CR-1).
  - **1300-2600:** the flip-bloom words drift as colour swirls around the film (avoid-tagged). The hero sits down inside and bobs, with a closed-eye smile.
  - **Tableau:** the hero resting in its own bubble on the cloud.
- **Anticipation gag:** before the last bubble, the hero looks at the player for 400 ms (face offset toward the camera plus the `wow` face), as if to say "you do it".
- **Distinct silhouette from CLEANSE:** POP's bubbles are faceless, thin film, tethered and swaying, with one hero.

### CLEANSE: "Moon Pool"

**CR-10 · Put everything on the water, and give the scene a protagonist.**
- **Problem:** the spec puts the water plane in the lower 45% of the box, so it starts at 55%. But the lotus centre is at 48% and the top arc of orbs at 12-15%. Half the cast and the lotus therefore hang in the sky, which reads as sky lanterns: the twin the spec says it avoids.
- **Fix:** a high horizon at ≈ 26% of the box (looking down onto the pool), with the moon and its reflection above it.
  - **Back row:** 3 orbs, 68 px, at y ≈ 44%, slightly dimmer (depth).
  - **Front row:** 3 orbs, 88 px, at y ≈ 76%.
  - **Lotus:** at ≈ 58%.
  - Each orb sits on the water with a ripple ring at its base. Its word and caption stay below the ball, with no overlap (Standard 4).
  - Recheck 2-line words in both rows.
- **Protagonist:** seven characters and no hero. The session character (SYNC for panic) is just one orb among six. Fix:
  - The session character becomes the front-centre orb, 96 px, suggested last. Order: front sides → back row → centre.
  - When it clears, it glides on its pad to the lotus, the lotus opens for it, STILL wakes, and they touch foreheads (both win faces).
  - That meeting, loud and calm together, is the scene's emotional resolution, landing on the T0 + 1300 sting (CR-2).
- **Lotus as the in-world progress meter:** one petal loosens and glows per cleared orb. This replaces the "0%" that is being removed. The finale opens the rest.

**CR-11 · Fix the breath pacing and the instruction wall.**
- **Pacing:**
  - **Problem:** an 850 ms fill plus `eosBreathOwn("in", 850)` plus a 1400 ms exhale paces a breath cycle of about 2.3 s, about 26 per minute. That is hyperventilation pace in the game routed second for panic.high.
  - **Fix:** keep 850 ms as the acceptance threshold (no fail, accessible). The water fill and the Still Point inhale run over 3.0 s to a full breath, and the gold rim comes at 3 s.
  - A release after a full breath is a "deep clear": a bigger ink plume, the pad blooms a flower, and a richer chime.
  - The exhale visual lasts at least 2.4 s, and other orbs stay holdable during it.
  - `--hold-pct` maps to the 3 s fill.
  - The marker label becomes "BREATHE IN… LET GO".
- **Captions:**
  - **Problem:** six "HOLD TO …" captions at once, plus the guide text, read as therapy homework (sheet 109, `390_start`).
  - **Fix:** keep every emotion-aware caption (Standard 7), but show it at full strength only on the marked or held orb.
    - Others are at 0.5 opacity and 13 px. Today's 12 px at 80% is too faint on night water.
    - The held orb's caption becomes the coaching line in the moment: "hold to slow", then "breathe in…", then "let go…".
- **Toasts:**
  - **Problem:** the arcade "+STILL HIT · CHAIN ×6" and "SPACE ✓ +12 ×3" pills jar on a breathing game (sheet 109, `390_mid` and `390_finish`).
  - **Fix:** in `.eosPilotCleanse`, restyle the docked toast to a quiet variant (no glow pill, smaller, 0.8 opacity). It is kept, just quieter.
- **Ending:** the clearest night, not dawn (CR-1).

### CRUSH: "The Press"

**CR-12 · Squeeze out the heat, not the character.**
- **Problem:** flinch → dizzy stars → goo cracks reads as injury. For anger, repeatedly crushing the character that *is* your feeling reads as self-punishment. Sticking out a tongue on a miss is taunting, not sheepish.
- **Fix:** each slam squirts red-hot goo and steam out of the jelly rim, into the heat tray.
- The blob's rim hue moves from angry red toward its calm hue in steps of 0 / 33 / 66 / 100% per slam.
- Faces (CR-4) follow the slams: furious → gritted effort → puffed-cheek "pfff" → pancake with a relieved grin → the `phew` pop-back.
- On a miss, the blob tilts and raises a curious eyebrow.
- The embers in the tray are visibly that squeezed-out heat, so the finale cube is made from what the player discharged.

**CR-13 · Give the player the final blow, and decide what is inside the cube.**
- **Problem:** the mega slam is automatic (T0 + 450-800). The biggest hit of a discharge game is taken away from the player, who sits and watches.
- **Fix:**
  - After the 24th slam's pop-back, the embers fuse on the anvil (600 ms set-up). The shelf blobs gather, the lights dim, and the jaw rises extra high (an anticipation hold).
  - The marker reads "ONE BIG SLAM" on the glowing mass.
  - **The 25th tap is T0:** the slam lands at + 40, the cube appears at + 300, the three cracks light from + 500 to + 1100, and the burst comes at + 1300 on win × 3.
  - Progress stays at 96 from the 24th slam until the hand-off (F2).
- **Inside the cube:** a small, warm, glowing core. RUSH catches it and holds it (CR-1): heat became warmth.

**CR-14 · Make the rhythm readable and the rounds tighter.**
- **Heavy window:** today it lives on a gauge at the right column, y 42%, outside the focal area.
  - Show the "ready" moment on the jaw itself: its edge lights amber and a click ticks, from 180 to 320 ms.
  - Stamp `CRUSH n/4` as 4 pips on the tag under the word. The gauge stays as well.
- **Round transitions** cost 1100 ms × 5, which is 5.5 s of waiting.
  - Show the next blob peeking at the conveyor's left edge.
  - Start its roll-in at the pop-back (+ 350, not + 1100), so a transition takes about 700 ms.
- **Phone, after CR-3:** the press mouth is centred at y ≈ 450 and the tag at ≈ 560.
- **Desktop:** use the width. Show a visible queue of 2 waiting blobs on the left and the shelf audience on the right.

---

## P2: polish

- **CR-15 · Phone speakers.** CRUSH `slam` (70 → 48 Hz), `heavy` (55 Hz) and `finale.mega` (55 Hz) are inaudible on phone speakers, which roll off below about 150-200 Hz.
  - Add a body layer at 140-220 Hz and a 2-4 kHz click transient to each, so the impact is heard.
  - Give heavy hits a distinct two-pulse haptic.
- **CR-16 · CLEANSE melody.** Choose the six `clear` notes (`eosNote(k, 392)`) so the 6th note resolves on the tonic. The melody then completes when the scene does, and wave 2 restarts the phrase.
- **CR-17 · POP chain personality.** At chain 3 the hero gives a micro-giggle (the `giggle` face); at chain 5 it laughs and does a one-foot hop. Slow pops still get the calm `phew`. No punishment either way.
- **CR-18 · Hero naming.** Show the hero's name label (13 px) at the start and in the tableau only. Mid-play it competes with the words.
- **CR-19 · Reveal leftovers to flag.** CRUSH's phone reveal (card and giant face clipped on the right, sheet 2 `390_reveal`), the missing desktop card (sheet 1 `1280_reveal`) and the clipped header ("MOTIONAL RELEASE CONSO") are W0-2 or chrome items. Re-shoot them in the approval package and list them, so they are not mistaken for pilot regressions.

## Keep (the spec gets these right)

- The core mechanics differ in gesture, rhythm and physics: tap-release tethers, hold-and-breathe, a slam rhythm with a heavy window.
- Direct manipulation: the object is the target, with no pill.
- Faces are driven by progress, not by the word.
- `onDone` is called once, timers are cleared only on unmount, there is no 3.2 s lock, and faces are decoded before display.
- WAAPI motion with one React commit per input, and the performance caps.
- A real `<button>` with keyboard support, and `?pilot=off`.
- The sound-sync log and the distinctiveness paragraphs.
- CRUSH's `p.sfx` is called once per word (G4).
- The heat tray, so each word's discharge becomes the finale's material.
- POP's merge into a calm bubble, CLEANSE's mirror and lotus, CRUSH's cube from embers. These are the right seeds; CR-1, CR-9, CR-10 and CR-13 only change what grows from them.
