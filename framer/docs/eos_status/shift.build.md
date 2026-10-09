# shift — build report (FINISHED)

## What I built
`src/eos/50_eos_shift.jsx` covers spec §2.4, §6.6, §0.3 (retro rows), §0.4 (EOS_BREATH and the pacer) and §10.2 (the safety tie-in).

The reveal now plays as one short story:

1. **Still Moment (`EosStillMoment`).** It runs only when it adds something, and never after a slow or breath game (111, 112, 109, 65, 66, 69, 80, 36, 44). It also never runs as a heart moment after 114/115 or as a spark moment after 117. Tapping anywhere outside the orb, "skip ›" or Escape skips it from 0 s.
   - **sigh** ("blow the memory orb home"): hold the orb to fill it (1.6 s, `eosBreathOwn("in",1600)`). Then slide up 24 px, tap with a second finger, or keep holding 1 s for the auto top-up: one more sip (0.5 s). Letting go starts a 4.4 s linear blow (`eosBreathOwn("out",4400)`, `rainSfx(4)`, `eosHaptic("exhale")`). The orb drifts toward the shelf while dust streams behind it and the face crossfades loud → calm. If untouched for 8 s it plays the blow by itself once.
   - **cool**: the same, twice, with progress pips. It is used for anger after a discharge game and always auto-starts, veterans included.
   - **heart**: "Thumb on the orb — and if you like, your other hand on your own chest." Hold 3 s while `eosHeartbeat` slows 60 → 52 bpm and drives the visual ripples and thump. Releasing pauses the fill and never resets it. Then an optional 5 s "stay here" (in 2 s / out 3 s) with a "continue ›" link.
   - **spark**: tap the orb 3× on a visible 90 bpm pulse (`eosPacerBeat(90)`, rising `eosTone`). A numb face's grey turns to colour.
   - Heart and spark finish by themselves at 6.5 s.
   - Arrows come from `eosApi("arrows").EosHandHint`: "HOLD TO FILL IT" → "SIP MORE ↑", "HOLD · HAND ON HEART", "TAP ×3 ON THE BEAT".
   - Veterans (≥ 5 rated loops) get a one-tap chip instead of the auto-start: "one big sigh? ›", "a quiet moment? ›" or "spark it? ›".
   - Reduced motion or calm visuals: cross-fades, scale ≤ 4 %, and an "in 2… out 4…" countdown.
2. **Rate.** One `EosIntensityDial` (0-10) asks "How loud is RUSH (anger) now?".
   - It starts at "–", with a gold ghost marker at *before*. "✓ SET" is disabled until a value is chosen.
   - The dial turns the feeling down by hand: the character scales `.85 + .04n`, its face crossfades loud → calm (it rises for GOOD), and `eosApi("dots").setLevel(n)` follows live.
   - The payoff starts 900 ms after the last change (never while the finger is still down) or on ✓ SET.
   - "skip" records `EosRecordShift(null)`.
   - When `before` is null (no check-in or an express launch), the chip "you came in at about **N** · change" appears; "change" opens a compact before-dial. That row is written with `retro:1`.
   - Focus moves to the dial unless a text field has focus.
3. **Payoff (≤ 1.2 s).**
   - `EosRecordShift` runs, then `eosApi("safety").soft?.(shift)` and `eosApi("rewards").grantForShift?.(shift)`.
   - The number counts before → after at 60 ms per step with soft ticks. It resolves on the 3-note sting (G4 → C5 → E5, a rising major arpeggio) + `sfx("chime")` + `eosHaptic("finish")`, followed by a per-emotion finish chord.
   - Stamp **"5 LIGHTER ✦"** (or "N BRIGHTER ✦" for GOOD) with the tier word "big shift" or "a little lighter".
   - Headline **"ANGER 8 → 3 · COOL"** (`aria-live`) and **"RUSH handed back the controls ✦"**. The character slides aside, STILL takes the centre ("STILL · at the controls"), and confetti fires.
   - A built-in personal line per emotion shows until flipdata arrives in release 2.
   - Δ ≤ 0: "RUSH is still here — that's okay. Some feelings need a different door." with no stamp.
   - Under any safety flag: no stamp, confetti or chord, and the headline reads "You showed up for yourself.".
4. **Memory orb flight.** The orb (face inside, gold or silver rim) arcs on a 16-keyframe Web Animations path into `[data-eos-chip="orbs"]`, then squashes, bumps the chip, shows "+1" and plays `sfx("plink")`. Under reduced motion it cross-fades; with no chip it fades in place.
   - Rewards line (13 px): the rewards `line`, or "+1 memory orb · RUSH bond 2 · ☀ 4 days this week" built from the grant, or "☀ N days this week" when the rewards module is absent. "+25 ⚡ for showing up" is always appended.
5. **Buttons (at most 3, ≥ 48 px)**:
   - **I'M GOOD ✓** (gold) → `onDoneForNow`.
   - **ONE MORE ▶** with the next game's name, from `eosApi("router").EosSecondAct`, then `onPlay(gameObj)`; or `onNext()` when there is none. For anger after a discharge game it reads **"COOL IT DOWN ▶"** and sends 112.
   - **SHARE**: `eosApi("rewards").EosShareButton`. For shame, lonely, sad and fear it becomes a "make a card" text link. Under a safety flag it is replaced by **"💛 Talk to someone"** (`eosApi("safety").open("info")`).
   - Text link: "Need to talk to someone?".
   - After 3 loops or 10 minutes: "You've shifted 3 times — nice. Take the calm with you?", and ONE MORE becomes secondary.
6. **Declutter (CSS).** While the meter is present, the old FEEL A SHIFT? question is hidden. Until `data-step="done"`, "RELEASE COMPLETE · +N", the final message and PREVIOUS/NEXT are also hidden and the floating faces dim to .3; all of them return after the payoff. "↻ AGAIN" stays.
   - On phone (≤ 560 px) the arcade forces the reveal shell to `display:block` at ~256 px wide. While the meter is present the card now spans the full width, PREVIOUS/NEXT sit side by side under it, the overlay scrolls, and 60 px of top padding leave room for the world chips.
   - "+25 ⚡" is paid by `addScore(25)` exactly once per launch (keyed by `launchAt`), when the meter mounts.
   - The meter renders `null` when `checkinEnabled` is false; the old flow was verified intact.

## Exports
- `EosShiftMeter({game, sfx, rainSfx, reduced, onAgain, onPlay, onNext, onDoneForNow, addScore})`
- `EosStillMoment({emotion, gameId, band, variant: "sigh"|"cool"|"heart"|"spark", onDone(reason), reduced, rainSfx})`
- `EOS_SHIFT_CSS` (`eosCss("shift")`)
- `eosExpose("shift", {EosShiftMeter, EosStillMoment, EOS_SHIFT_CSS, plan, context, next, weekDays, rewardsLine, flyOrb, dev})`
- Private helpers use the `eosShift*` / `EOS_SHIFT_*` / `EosShift*` prefixes. Keyframes are `eosShift*`.

## Integrator wiring (exact)
1. **I2-E9 is already correct in `dev/eos_integrate.py`; nothing new is needed.** `onPlay={startChosenGame}` receives a GAMES object. `onNext={tryRecommendedRelease}`, `onAgain={replay}`, `onDoneForNow={clearForNext}`, and `addScore` is as written in E9. "↻ same game" is the arcade's existing "↻ AGAIN" button, which stays under the meter. For anger after one replay of a smash game, the meter hides it and shows "↻ cool it down" (→ 112).
2. **Rewards (52, not built yet).**
   - `grantForShift(shift)` → `{orb:{tier:"gold"|"silver", face, char}, bond:{char, level}, week:number | {days}, line?}`. Every field is optional.
   - `EosShareButton` must accept `{shift}` and `{shift, variant:"link", label:"make a card"}`. The meter wraps the link variant in `.eosShiftShareLink`, which styles any inner button or link as a text link.
   - World chips: the landing target is `[data-eos-chip="orbs"]` inside `.releaseStage`. On landing the meter bumps the chip (Web Animations scale), adds a "+1" tag, plays `sfx("plink")`, and dispatches a bubbling `CustomEvent("eos:orb-landed", {detail:{tier}})` on the chip. The chips component should listen for it to refresh its count. The orb's z-index is computed above both the overlay and the chips.
3. **Safety (not built yet).** It needs `eosExpose("safety", {soft(shift), open("info")})`. Until then, "💛 Talk to someone" and "Need to talk to someone?" open an inline fallback panel built from the store's `crisisLines`, `crisisUrl` and `emergencyText` (or `EOS_PROP_DEFAULTS`).
4. **Flip (release 2).** Optional `eosApi("flip").line(flipKey, emotion)` → string. Without it the module uses its built-in `EOS_SHIFT_LINES`.
5. **Release 1 degradation.** `next()` returns only ids registered at runtime; 112 is used only when registered, otherwise the router, otherwise `onNext()`. A missing rewards, safety or flip module means no share button and no empty slot, and nothing throws.

## Acceptance results
The test builds were:
- `/tmp/eos_shift_int`: shift + 111-114 + arrows + router.
- `/tmp/eos_shift_int2`: the same plus test-only rewards/safety stand-ins kept in /tmp.
- `/tmp/eos_shift_fin` and `/tmp/eos_shift_all`: every current module.
- `/tmp/eos_shift_iso`: core + shift only.

All runs had zero page errors and zero shift warnings.

1. POP with anger 8: the sigh moment auto-runs, and a tap skips it in 35 ms. CRUSH with anger and 6 prior rated loops: the cool variant (2 pips) auto-runs, the button reads "COOL IT DOWN ▶ COOL THE VOLCANO", and clicking it launches 112 (act 2, before 3). 111 goes straight to rate. `plan()` returns null for 109/111. A veteran on POP gets the "one big sigh? ›" chip, and tapping it starts the moment.
2. The sigh pacer log reads `in:1600 → in:500 → out:4400 → free`, and the ring drains `linear 4.4s`. Heart (sad after CRUSH) and spark (numb after CRUSH) auto-complete at 6501 ms.
3. The rate step starts at "–" with the ghost on 8 and SET disabled. "skip" writes a row with `after:null`. With no check-in, the chip "you came in at about 7 · change" appears and the row has `retro:1`.
4. With the moment skipped, the payoff reached "ANGER 8 → 3 · COOL" / "5 LIGHTER ✦" / "RUSH handed back the controls ✦":
   - at 390: 4.35-4.48 s after the finish
   - at 1280: 3.3-6.3 s, with headless running at about 3 fps
5. `addScore(25)` was called once per launch in every run (dev `paid` = 1).
6. Before done, the old small copy, final message, side nav and FEEL A SHIFT? choices are all hidden. Every run had at most 3 action buttons, at least 50 px tall.
7. With a soft flag: no stamp and no share, "💛 Talk to someone" is present, and clicking it calls `open("info")`. For sad, share is the "make a card" link.
8. The orb lands in the ◉ chip (`eos:orb-landed` count 1).
9. `safety.soft` is called with the recorded shift in every run.
10. With `reducedMotion: "reduce"` the moment shows "in 2…" at scale 1.03. With the calm-visuals pref at 1280, zero errors. Copy lint (EOS scope) is clean. When check-in is disabled there is no meter and the old YES/NOT YET flow works.

The reduced-motion and calm runs flagged two 12 px texts (the personal line and the next-game name) rendering at 11.7-11.9 px, because the reveal card is drawn at about 0.975 scale. Every small text in the meter is now at least 13 px. Those runs predate the change, and smallText was not run again afterwards.

## Screenshots
`framer/dev/shots/eos/` (`_moment` / `_rate` / `_done`):
- shift_pop_anger_390_*
- shift_crush_cool_1280_*
- shift_crush_sad_heart_390_*
- shift_crush_numb_spark_390_*
- shift_pop_nocheckin_390_*
- shift_pop_safety_390_*
- shift_pop_sad_1280_*
- shift_pop_reduced_390_*
- shift_calm_panic_1280_*
- shift_pop_veteran_390_*

## Known limitations
- In the done step the restored old reveal copy plus the meter can exceed the phone overlay height by about 100-170 px. The overlay scrolls and I'M GOOD stays on screen in the reviewed shots.
- At 1280 the orb was sometimes still in flight when measured (headless runs at about 3 fps), so a landing was counted there only in the CRUSH run.
- Share, bond and rarity visuals depend on the rewards module, and the real safety card on the safety module. Both were exercised only with test stand-ins.
- No companion hook: the companion module does not exist yet. It can follow `eosBreathPhase()`, which the Still Moment owns while it runs.

## Close-out of review r1 (all in `src/eos/50_eos_shift.jsx`)
The checks ran in the isolated integrated build `/tmp/v2_shift` (every src/eos module) at 390x844 and 1280x860. Every run had zero page errors and zero warnings.
- **Retro before (major).** The "you came in at about N · change" chip now sits above the after-dial. A pointerdown on the chip or the retro dial pauses the auto-commit, and so does an open retro dial; "done" re-arms it. While the chip is offered the settle is 1.6 s (900 ms otherwise).
  - Setting after = 3 and then tapping "change" right away keeps the rate step open for more than 2.6 s. After "done" the row is {before:9, after:3, retro:1} with the headline "ANGER 9 → 3".
  - In chip-first order the row is {before:6, after:2, retro:1}.
- **STILL as the feeling's character (major).** The root gets `.isSolo`, which every hand-back rule now excludes, including the reduced-motion and calm opacity rules. The gold rim is applied by `.isSolo.isWon`.
  - GOOD 4 → 8 at 390: the ball centre equals the stage centre (195), the tag is visible and the rim is gold.
  - Reduced motion at 1280: the character is centred at 640 with opacity 1.
- **Centring at 1280 (major).** While the meter is present the shell is a grid (84px / 1fr / 84px) and the card has margin-inline:auto. The card centre is 640 in the moment, rate and done steps, with PREVIOUS and NEXT beside it.
- **Minor fixes:**
  - The veteran chip clears the pending settle. With the dial set, then the chip tapped within milliseconds, the step is still "moment" 1.8 s later; the value is kept and ✓ SET works.
  - "You've shifted N times" counts only rated loops in this app session. After 3 skips it does not appear.
  - The chip bump is no longer cancelled by the orb's cleanup.
  - `touch-action:none` is set only on the orb.
  - Dial digits in the meter are 13.5 px. smallText(12) is clean in the rate and done steps at 390.
  - The idle before the auto-start is 2.5 s for cool and 4 s for sigh. An untouched sigh takes 12.3 s and an untouched cool 16.7 s at 1280 (headless at about 3 fps).
  - On phone the restored reveal copy is ordered below the meter, so the headline stays at y=293 from the payoff through done. I'M GOOD sits at y=487.
  - On phone the overlay fades out its top 60 px under the world chips.
  - RUSH's calm face for anger is 59 (eyes closed), set locally in shift.
  - A face image that fails is retried once after 800 ms with a cache-buster. Only after that does it fall back to a calm SVG face in the character's own hue (STILL is 190).
  - The game name in ONE MORE wraps instead of being cut short with an ellipsis.
  - The Still Moment hand hint rests on the orb's lower-right through `rest`, so the hold demo is centred about 25 px off the face centre.
