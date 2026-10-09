# CLEANSE (id 109) "Moon Pool": pilot build report

**File:** `framer/src/pilot/73_pilot_cleanse.jsx`. It registers itself with `eosPilotRegister(109, EosPilotCleanseEngine)` and uses only the shared systems in `70_pilot_core.jsx` and `71_pilot_fx.jsx`. It does not change `00_arcade.jsx` or `src/eos/`.

**Evidence:**
- Before: `dev/shots/quality/sheets/109.png`.
- After, phone: `docs/pilot/status/game-cleanse.after_390.png` (start, almost, hold, release, finale at T0+0.3/0.9/1.3/1.8/3.0 s, reveal).
- After, desktop: `docs/pilot/status/game-cleanse.after_1280_v1.png` (full set with the earlier desktop rows) and `game-cleanse.after_1280.png` (final rows: start, peak, tableau).

## What the game is now
Six characters sit inside clouded glass orbs on a still night pool. A closed pink lotus bud sits between the two rows of orbs, with STILL glowing faintly inside it. The session's own character (the protagonist) waits front-centre.

**Hold an orb:**
- It looks up at the moon, widens its eyes and stretches up as it breathes in for about 3 s.
- Clear water rises inside the glass and the murk thins.
- Ripple rings spread on the water under it.
- The other orbs breathe in with it: uncleared orbs inhale gently and cleared orbs turn to watch.
- The lotus heart warms and the Still Point breathes in too.
- At 3 s the rim turns gold and the caption changes from "breathe in…" to "let go…".

**Let go:**
- The orb breathes out over 2.4 s with a squash, a settle and its phew face.
- Ink puffs leave the glass sideways and spread into the water.
- The glass clears and the orb settles onto a lily pad that scales in under it. It then turns toward the lotus with a varied settle: a nod, a look at the lotus, a look at the camera, or a sway.
- A deep clear (held past 3 s) adds a small flower on the pad and a richer chime.
- The other orbs breathe out with it.
- One more lotus petal loosens and glows, and the pool's murk and ripples ease.
- A melody note plays. The melody rises through G pentatonic, so the last clear lands on the tonic.

**Early release and misses:** these are never a fail.
- Letting go early drains the water and plays a small sigh with "a little longer…".
- A tap on the waiting protagonist makes it tilt toward the orb it is waiting for, with "after the others…".
- A tap on open water makes a ripple where you touched, and the next orb reacts to it.

**Finale "Clearest Night" (T0 = the protagonist's release):**
- **0 s:** one ripple ring sweeps the pool. The water turns into a mirror plate with doubled stars.
- **0.2 s:** the protagonist glides up the centre to the lotus, a silver moon path lays itself from the moon's reflection to the lotus, and every cleared orb turns to watch.
- **0.5 to 1.3 s:** the lotus opens. Its 8 petals are staggered so the last one finishes at 1.3 s.
- **1.3 s (peak, on the wrapper's win × 3):**
  - the lotus's gold becomes the key light, and glosses and rims relight warm and low;
  - a gold ring blooms;
  - STILL wakes with its win face, rises and grows slightly;
  - STILL and the protagonist lean in to touch foreheads.
- **Afterglow:** the pair sway once together, the cleared orbs glint, fireflies lift off the reeds, and the grade completes as a supporting move.
- **2.6 s tableau:** the protagonist's name returns under it.
- **Hand-off:** `onDone` is called once by S2, then `onProgress(100, "100% CLEANSED")`. The reveal carries the pool afterglow and the protagonist's win face in a circle.

## How each standard is met
1. **Characters are active in-world participants.** The actor rig is inside the game's state machine, not an overlay:
   - Every input type gets a reaction: hold, ready, release, early release, a tap on the waiting protagonist, a miss, and wave change.
   - The supporting cast reacts too: sympathetic breathing, cleared orbs leaning in to watch, and STILL's glow.
   - Faces change with progress: loud → soft (34%) → calm (67%).
   - The finale role is STILL waking and the forehead touch.
2. **Its own finale.** A lotus opening under a mirror-still night sky, with a gold key light and a forehead touch. It shares no sky lift, dawn or lantern with 111 or 114. The shared bloom and grade are supplements only.
3. **Different gameplay from its look-alikes.** The hold is on the character itself and is paced by the shared breath (about 3 s in, 2.4 s out). There is no timing window. The world itself is the progress meter: murk, ripples, moon reflection and lotus petals.
4. **Bubble image rules.** Every face is inside a circular ball (`border-radius: 50%`, `overflow: hidden`). The murk and the water stay inside the circle. There is no plate behind the ball. The word (15 px phone / 16 px desktop, weight 800) and the 13 px caption sit below the ball as one hit block, so the old "pill floating apart" problem is gone. `smallText(12)` found nothing at 390 or 1280.
5. **Cinematic.**
   - The `pool` kit with a high horizon, the moon, a tree line, mist, reeds and far lily pads with moonlit rims.
   - A cool rim light from the left and the moon's specular highlight on the glass.
   - A static depth of field and a slightly dimmer back row.
   - At the peak, the key light moves to the lotus.
   - Every input has a sound cue, and each one is logged (S4).
6. **Honest evaluation.** See the gaps below.
7. **No features removed.**
   - Progress bar and `n% CLEANSED` label are kept.
   - A new `k / N CLEAR` pill and the lotus petals act as in-world meters.
   - LIVE GUIDE is docked on phone, with MIND BEND shown at the hand-off.
   - Arrows: a marker with `{g: "hold", ms: 3000, mvar: "--hold-pct", label: "BREATHE IN… LET GO"}` sits on exactly one enabled orb.
   - Sound: arcade `soft` and `pop` plus tones, and the sound toggle.
   - The quiet step toast, the chain and the haptics are kept.
   - Emotion-aware `hold to <action>` captions are kept.
   - User images replace faces.
   - Waves of up to 6.
   - The word merge (no "i" or "feel" orbs).
   - Keyboard: Space/Enter hold, Escape cancels.
   - `?pilot=off` plays the original game.
   - The reveal bug (G10) is fixed: the reveal appears in every run.
8. **Readiness results:**
   - Functional: `finishGame` reaches the reveal at 390, at 1280, and at 390 with reduced motion. Arrows were checked with 0 misses and 0 label mismatches, and there were 0 page errors. Progress was 0/33/67/96/100 and 0/17/…/83/96/100: monotonic, with 100 only at the hand-off.
   - Visual: the screenshots above.
9. **Mobile first.**
   - At 390, the front row is at y ≈ 573 (marked target centre ≥ 480) and the back row at y ≈ 319.
   - Orb hit blocks are 108 × 141.
   - The guide is a 44 px strip during play.
   - The finale is composed above the strip.

## Measured (headless, CPU load 8-27 on 4 cores from the parallel workflow)
- **DOM:** 219 nodes at N = 6 (limit 220), 146 at N = 3.
- **Running animations in the arena:**
  - idle at start: 40;
  - during a hold: 32-33;
  - with the finale state settled (fake-clock frames): 4-14;
  - sampled mid-finale on the starved real clock: 41-57, because petal and grade transitions overlap the last exhale.
- **Sound log:** every input logs a row per layer: hold (tone + arcade `soft`), release (tone + arcade `pop`), almost, ready, clear, clearDeep, ripple, lotus × 5, night × 3.
  - Input-to-tone `dt` at 390 was 0-349 ms (median ≈ 68). This reflects main-thread queueing on the starved machine; the cue itself fires synchronously in the pointer handler.
  - The ≤ 15 ms target **is not demonstrated here**.
- **Finale frames:** `page.screenshot` took up to about 10 s and screencast frames lagged the page by seconds. The finale frames were therefore taken with Playwright's fake clock: paused at the last release, advanced to each offset, and in-flight animations left to settle before the shot. They show the composition at each beat, not mid-animation timing.

## Known gaps (honest)
- **Not measured:** F6 latency, F9 peak timing (± 60 ms), frame-time p50/p95, Event Timing and the phone recording. The machine was too loaded for any of these to be meaningful.
- **Desktop finish toast:** the wrapper's finish toast, docked under the HUD, touches the top of the back-row orbs for its 3 s after the hand-off. The final desktop sheet shows the overlap is slight. The toast position belongs to the shared S6.2 dock.
- **Shared effects over the scene:**
  - the wrapper's step-burst character particles at each release;
  - the shared bloom words "safe / slow / right here" at the peak;
  - the corner companion. The moon was moved left on phone to avoid it, so this is a deviation from the spec's 80% position.
- **Touch overlap:** STILL and the protagonist overlap by 4-10 px at the forehead touch, with the protagonist in front. STILL's lower half is partly hidden.
- **Desktop 2-line words:** with a 2-line word on the desktop back-centre orb, the risen STILL can touch that label's caption line (estimated from the measurements; not shot).
- **Win faces:** the protagonist uses the last entry of `EOS_WIN_FACES[char]`. Only SYNC (63, closed-eye smile) was checked visually.
- **Not run:**
  - wave mode with more than 6 chunks: implemented, but there was no test run within budget;
  - the F7 `getAnimations` transform check under reduced motion and the calm toggle (the reduced-motion `finishGame` run did pass);
  - the automated F10 acting check.
- **Original game:** with `?pilot=off` the original CLEANSE rendered and progressed to 67%, but my 120 s check budget ran out because the original locks for 3.2 s per release. The systems step had already verified that the original reaches the reveal.
- **Bubble index:** `data-ts-bubble-index` was not added. The new wrapper uses it only to rotate phase images, which the pilot ignores, and no wrapper reaction face appeared on the orbs.
- **Idle animations:** the idle count of 40 is at the P1 cap. The spec's own idle estimate was 20, because actor idle loops and quirks add about 14.
