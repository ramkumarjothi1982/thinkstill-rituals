# Phase 3 report: Weather Weaver, Hushbeat Symphony, Mallow Nightlight

**Status:** built, reviewed and tested in Chromium at phone, small-phone,
landscape and desktop sizes, in the local lab and in the published bundle.
It has **not yet been tried on a physical phone** (see the checklist below).

| | |
|---|---|
| Branch | `claude/epic-mendel-3lfmuy` |
| Phase 2 approved at | `56f206d` |
| Phase 3 milestone | the commit that adds this report (the head of the branch); test results and screenshots at `171734e` |
| Production files changed | **none**. Everything is under `hushmallow/sensory-lab/`; `hushmallow/src/` is imported read-only. |
| Preview link | private claude.ai artifact, the same link as before: https://claude.ai/artifact/LDiTDFQuZJrhzhHx9N9dtb |
| Playable experiences | 7 of 10: Mallow TouchTalk, SoftBody Lab, Pocket Hush, Comfort DNA, **Hushfold Weather Weaver**, **Hushbeat Symphony**, **Mallow Nightlight** |
| Run it locally | `cd thinkstill-rituals && python3 -m http.server 8000`, then open `http://localhost:8000/hushmallow/sensory-lab/index.html#weather` (or `#hushbeat`, `#nightlight`) |

The three new experiences are on Home as "Hushfold Weather Weaver", "Hushbeat
Symphony" and "Mallow Nightlight". Each opens in one tap, works with any of the
seven Mallows, and
has a feature reference: [WEATHER.md](WEATHER.md), [HUSHBEAT.md](HUSHBEAT.md),
[NIGHTLIGHT.md](NIGHTLIGHT.md).

## What is built

### The shared engine (used by all three)
Phase 3 finished the Environment and Effects engines, so the three features
share one way of doing each thing rather than three:

- **Environment Engine** (`core/environment.js`): one Hushfold realm per
  screen, mood and transform with throttled updates, realm geometry (horizon,
  water, sun and moon anchors, pinned to the production realm files by a
  test), still paintings of a realm for Nightlight, and realm pulses that go
  through the photosafe limiter.
- **Photosafety:** one `FlashGate` per screen limits bright events from the
  realm and the lab together to at most three a second. A refused flash is
  dropped, never turned into something else.
- **Pointer routing** (`core/pointer-router.js`): touches off the Mallow can
  be claimed by a feature's tools (Weather) or watched as a still press
  (Hushbeat's and Nightlight's breath lead). A touch on the Mallow is always
  TouchTalk.
- **Ambient beds** (`core/ambience.js`): looping noise and pad layers that
  rebuild themselves after mute, a hidden page or the voice cap.
- **SoftMallow and sound additions:** body rectangle, nudges (lean, squash,
  tilt, hop), a frame cap (Nightlight runs at 10–24 fps), overlays, a colour
  grade drawn by the mesh renderer, stereo pan, sends, kept voices, a session
  trim and a rest state for the sound engine.
- **Character controls:** `FaceMixer` merges face changes from several owners
  (a resting face, a mode, a passing event), and a response filter keeps
  reactions gentle where a feature needs it (Nightlight's night filter,
  reduced motion, the Gentle style).
- **Duet stage:** a second Mallow can share the screen (Hushbeat), each with
  its own soft body, and lab-wide settings reach both.

### Hushfold Weather Weaver (`#weather`)
The Mallow sits in a Hushfold world, and the sky above it is something you
can touch. Eight weathers sit on a dial ("Pick a sky"): **Sunshine, Wind,
Fog, Rain, Storm, Moonlight, Starlight, Warm glow**. Each has its own touch
tool and its own gentle resolution:

| Weather | You | It resolves into |
|---|---|---|
| Sunshine | drag a warm light pool; the haze burns away along its path; the Mallow basks | golden hour |
| Wind | drag a current; ribbons and fluffs ride it; slow strokes build calm | "Just a breeze now." |
| Fog | wipe the mist; a hold grows a clear patch; the Mallow glows like a lantern | the fog lifts, dew glints |
| Rain | hold still to gather drops into a glass bead, then let it go up as light | the clouds drift off, puddles glint |
| Storm | swipe the thunderheads apart like curtains; light shafts reach the Mallow | the clouds drift away |
| Moonlight | drag a silver pool over the water; a rest in the sky sends a falling star | "The night is clear." |
| Starlight | sweep up stars; let go to place a constellation in the Mallow's own shape | three constellations |
| Warm glow | drag a warm ribbon that kindles embers; hold the Mallow to make it the hearth | "Everything is glowing." |

- Water swells, ripples and puddles respond to touch in realms that have water.
- Changing weather either turns the sky in place or sends a **weather front**
  across while the realm changes behind it.
- Progress shows only in the world: it drives the realm's own mood and
  transform. There are no bars, counters or streaks.
- The resolve beat: the Mallow's reaction, a soft bloom, a short motif, a
  caption and one line from the Mallow.
- **Each Mallow has its own weather personality**: weathers it loves, ones
  it is wary of, a home weather, and its own reactions:
  - Glitzi delights in lightning.
  - Blubi melts in moonlight.
  - Noomi is lulled by ten seconds of rain.
  - Boppo hops in the puddles when the rain stops.
- Every touch tool has a button and arrow-key alternative.
- Storm uses soft glows instead of strikes under reduced motion and the
  Gentle style.
- A sound bed follows the weather: rain patter, wind, a soft thunder swell
  that is never a crack.

### Hushbeat Symphony (`#hushbeat`)
Make music by touching a Mallow. The Mallow is the instrument.

- **Gestures:**
  - Touch the body for a note, played at the moment of contact.
  - Double tap for a chord.
  - Hold for a hum.
  - Squeeze or press down for a warm bass.
  - Stroke for a phrase.
  - Drag up to bend a note.
  - A still press off the body leads the breath and sets the tempo.
- Every note is chosen from the Mallow's own scale over a four-chord loop
  built only from scale tones, so it stays in tune however fast you play.
- One breath is four bars.
- **Each of the seven has its own instrument, meter, scale, phrase style and
  dance**, for example:
  - Boppo: a bouncy 4/4 arpeggio on a scooping triangle.
  - Blubi: cascading droplets in 3/4.
  - Glitzi: a bit-crushed staircase that bobs behind the beat.
  - Noomi: a falling music-box lullaby.
- The Mallow sings its own notes, moves on the beat in character, glows with
  a hum and puffs its cheeks with the bass. The realm warms and clears with
  the music.
- **Duet:** **Friend** invites a second Mallow. It plays in the lead's key:
  - notes close together harmonise;
  - two hums bloom into one chord;
  - one Mallow answers the other's phrases.
  - **Both** (or G) plays them together.
- **Replay** has the Mallow sing the take back.
- **★ Keep** saves the tune to Comfort DNA (capped, viewable, deletable), and
  a kept tune can be reopened from Home.
- **Visual only** mode shows the music without sound.
- Every gesture has a button and a key.

### Mallow Nightlight (`#nightlight`)
A gentle bedtime companion. The Mallow gets ready for bed in its own world
at night and takes the light down with it. It makes no claims about sleep.

- **Five modes:**
  - **Moonlight:** its glow is the nightlight; a tap is a touch-lamp swell.
  - **Breathing Together:** it breathes at your pace, and you can lead.
  - **Sleepy Companion:** a seeded evening of yawns, stretches and dreams.
  - **Ambient Drift:** fireflies, clouds and a slowly sliding world.
  - **Quiet Company:** almost still, and silent by default.
- **The session follows the wall clock**, so a locked phone always finds it
  on time or finished.
- At the end:
  - the world dims first, then the Mallow, while the sound falls;
  - the Mallow falls asleep and the screen is torn down;
  - a near-black end view says "Nightlight finished at 23:42." with one of
    the Mallow's own rest lines.
  - After that nothing runs: no animation, no audio, no wake lock.
- **Settings** (they preview live behind the sheet):
  - brightness;
  - light colour: Moon, Soft, Warm, Candle or Ember;
  - speed;
  - volume;
  - timer: 10–60 minutes or none;
  - fade out;
  - movement;
  - an optional "Keep screen on", only where the browser supports it.
- **A little longer** adds ten minutes while it fades.
- Touches never extend the session.
- **Each Mallow has its own night**:
  - Noomi arrives already yawning.
  - Boppo's bounces get softer until it is still.
  - Glitzi keeps its side-eye open longest.
  - Pipzi's sparks fade to whispers.
  - Each has its own night world, dream and drowsy answer.
- Night chrome uses opaque dark tokens with no blur. It sleeps after 8 s of
  quiet, and Close still works on the first tap.
- Frame rates are capped low (10–24 fps by mode) to save battery.

### Comfort DNA and privacy
- Comfort DNA shapes all three experiences:
  - the favourite Mallow and its realm;
  - the response style: Gentle softens Storm and the night answers;
  - the breathing pace in Nightlight and Hushbeat;
  - movement;
  - the touch-sound and voice choices.
- Kept Hushbeat tunes are the only new thing saved. They are capped,
  listed in "View everything saved", and deleted with everything else.
- Weather keeps only the last weather, in memory, for this visit.
- Nightlight settings are device settings.
- Nothing infers, labels or stores anyone's feelings.

## Tests

| Suite | Result |
|---|---|
| `node --test hushmallow/sensory-lab/tests/*.test.mjs` (unit, Node) | **206 / 206 pass** |
| `node hushmallow/sensory-lab/tests/e2e-phase3.cjs` (Chromium; shared engine and isolation block, then the three feature suites) | **1651 / 1651 pass** (`docs/phase3/e2e-phase3.json`) |
|   · shared block (each feature leaves no trace on TouchTalk, SoftBody Lab, Pocket Hush, storage or audio) | 197 / 197 |
|   · Weather Weaver | 349 / 349 (`docs/phase3/weather/`) |
|   · Hushbeat Symphony | 665 / 665 (`docs/phase3/hushbeat/`) |
|   · Mallow Nightlight | 440 / 440 (`docs/phase3/nightlight/`) |
| `node hushmallow/sensory-lab/tests/e2e-phase2.cjs` (Phase 2 suite, unchanged) | **231 / 231 pass** |
| `node hushmallow/sensory-lab/tests/e2e.cjs` (Phase 1 suite; only its count of playable experiences changed) | **308 / 308 pass** |
| Where the browser suites ran | **On the published copy**: the staged files the link serves, identical to the repository's lab files. After the page switched to the self-hosted font, the shared block (197 / 197), Hushbeat's privacy block (16 / 16; 80 requests, none off the page's origin) and the Phase 1 suite (308 / 308) were rerun on the final copy. |
| Main app tests (`node --test hushmallow/tests/*.test.mjs`) | **69 / 69 pass** (unchanged) |

What the browser suites check, with real pointer and touch input:

- **Every weather, every Mallow:**
  - each touch tool reshapes its weather to its resolve beat;
  - fronts cross realms;
  - the Mallow reacts in character;
  - the sound bed follows;
  - no flash exceeds the photosafe limit;
  - reduced motion and Gentle turn strikes into glows;
  - the keyboard alternatives work;
  - a hidden page pauses everything;
  - layouts are clean at six viewports.
- **Hushbeat:**
  - notes sound at contact;
  - every gesture's musical role (the sound is analysed);
  - harmony stays in scale;
  - breath and tempo;
  - duet harmonies, answers and Both;
  - Replay, Keep and reopening a kept tune;
  - Visual only;
  - the sheet;
  - layouts with one and two Mallows.
- **Nightlight:**
  - all five modes;
  - the wall-clock session (including a page hidden across the end);
  - the fade and falling asleep;
  - A little longer;
  - the end view (nothing runs afterwards: no frames, no voices, the audio
    suspended);
  - every settings row;
  - chrome sleep;
  - minimum-brightness screenshots;
  - landscape;
  - the screen-wake fallback.
- **Isolation:** entering and leaving each feature leaves TouchTalk, SoftBody
  Lab and Pocket Hush exactly as before. The lab writes only its own keys.

Unit tests cover:
- the music theory, the time and the engine;
- the weather maths and sims;
- the Nightlight session, settings, pacing and character data;
- the frame pacer;
- the Environment;
- FlashGate;
- the ambience beds;
- copy lint: no therapy, health or sleep claims, no reading of a person's
  state, no streaks or scores;
- a static scan: no network calls, and no media, push or worker APIs;
- the brand: "hushmallow" is written with a small h in every file of the lab.

Screenshots of every weather, Hushbeat state and Nightlight mode are in
`docs/phase3/<feature>/`.

## Code review
A separate review pass tried to break Phase 3 before it was published:

1. **Finding.** For each feature, one reviewer hunted for bugs, races and leaks
   with scripted reproductions. A second used it like a demanding product
   owner at phone, small-phone and desktop sizes, against the brief, looking
   at its own screenshots. A third checked the shared engine for regressions
   in Phases 1 and 2.
2. **Verifying.** A skeptic then tried to refute every finding with its own
   reproduction.
3. **Fixing.** Each feature's owner fixed what survived, with a test for each
   major or minor finding where a test can catch it.

**Result:** 59 findings, of which 58 were confirmed and fixed. 7 of them were
major. The one not fixed was judged not worth changing: in Visual only mode,
Close goes straight home without a goodbye, as the spec chose on purpose.

| | Confirmed | Major | Minor | Polish |
|---|---|---|---|---|
| Weather Weaver | 19 | 2 | 9 | 8 |
| Hushbeat Symphony | 16 | 1 | 8 | 7 |
| Mallow Nightlight | 16 | 3 | 4 | 9 |
| Shared engine | 7 | 1 | 4 | 2 |

The major ones, all fixed:

1. **Weather, a sideways swipe never parted the storm.** A swipe across the
   thunderheads now carries the clouds ahead of the finger and opens a gap at
   the fingertip. Vertical swipes behave exactly as before.
2. **Weather, Again during a front's reveal left the front's veil over the
   world for good.** Again now waits for the reveal to finish, and a leftover
   veil always fades out at the reveal's pace.
3. **Hushbeat, holding a hum or bass silenced the Mallow:** taps, strokes and
   the Note chip played nothing. The held hum and bass are now layers beside
   the touch, so everything plays over them.
4. **Nightlight, changing the timer during the fade** restarted the clock but
   left the scene dim and asleep for the whole new session. The light now
   comes back up and the Mallow wakes.
5. **Nightlight, the controls never went to sleep** after a tap on a mode
   chip or the settings sheet.
6. **Nightlight, the settings sheet's Done button was drawn broken.** It was
   a half-height pill with the label below it.
7. **Shared, the same broken Done button.** Its cause was a shared style
   rule from Phase 3's sheet band. The band now takes its size from the
   sheet's edges, so a feature's own pill keeps its full height.

The minor ones include:

- **Weather:**
  - a parted storm survives a rotate or a quality drop;
  - no free progress from Storm → Sunshine → Storm;
  - held keys let go on a window blur;
  - the title stays readable when a storm darkens a light world;
  - pushed swells show in front of the Mallow.
- **Hushbeat:**
  - a hidden page no longer starts a friend's hello or a replay by itself;
  - two-handed play works;
  - Ctrl+digit is left to the browser;
  - the hint is readable over every world and shows on small phones;
  - the hold chips look like hold chips;
  - note beads rise from the mouth, not through the eyes.
- **Nightlight:**
  - a held "Hold to breathe in" is let go cleanly when the fade starts;
  - rotating while Drift settles;
  - leaving the end view by Back;
  - Moonlight's glow is now clearly its own.
- **Shared:**
  - Escape with a sheet open closes the sheet first;
  - leaving Nightlight wakes the sound for the next screen;
  - Home offers only the newest kept tune.

The polish items covered:

- Weather's thunderheads, beams, wind ribbons, night arrivals and
  constellation placement.
- Nightlight's sprite reuse (about 45 sprites per Light change down to 10),
  firefly spread and keyboard focus.
- Hushbeat's beat timing against output latency and the duet layout in
  landscape.

The last two shared change requests from the Hushbeat engineer also landed:
- a held H or S lets go when the window loses focus;
- Ctrl, Alt and Cmd key presses are left to the browser.

These come with a new browser check that fails without them. Two smaller
requests are left for later:
- the gesture engine should only start a squeeze when the second finger is
  on the body (Hushbeat works around it);
- an optional height for the automatic stroke.

## Visual QA
A second pass looked at every screenshot of every suite: 241 images across
Phases 1, 2 and 3, at five phone and desktop sizes plus landscape. It found 4
major problems, all fixed:

- **Home showed "nullnull" under the Mallow's name** when there were no "For
  you" offers. This had been there since Phase 2, including in the Phase 2
  preview. Element.append printed the two empty slots as text.
- **Weather's thunderheads looked blurred and ghosted**, with double edges.
  Each puff is now one crisp, soft-edged body, with its lit rim and gold
  twin drawn in register.
- **Hushbeat's short-landscape duet** had both Mallows floating beside an
  empty pedestal. The duet is now framed so that both Mallows stand on the
  world's pedestal at all seven viewports.
- **Nightlight's fade left bright sigh discs on the Mallow's face.** The sigh
  is now a soft wisp that drifts away above the head.

Each owner first reproduced their findings at the same size and state, so
only real problems were changed. Of the 68 findings:

- 48 were fixed.
- 5 were not real: mid-animation frames, or Zuzu's and Boppo's production
  reaction particles.
- 15 polish items were deferred. Most come from production art the lab must
  not change: Loomi's brows read as a second pair of closed eyes, realm
  clouds at wide sizes, and lily pad edges.

The fixes include:

- **Sheets:**
  - The band under a sheet's Done button now matches the sheet, and rows
    fade out above it instead of being sliced.
  - Nightlight's Done strip is opaque.
- **Focus:** a soft, inset keyboard focus ring.
- **Phase 1 and 2 screens:**
  - Softer landing dust and puffs (no more white discs at the Mallow's feet).
  - Readable Pocket Hush buttons on desktop.
  - A better-framed TouchTalk Mallow.
  - Even SoftBody, Settings and TouchTalk rows at 320 px.
- **Weather:**
  - Soft puddles.
  - No fog seam.
  - The storm hint follows the title's light text.
  - A whole-radio dial at 320 px.
  - Glitzi keeps its face at the storm's resolve.
  - Swells show on open water.
- **Hushbeat:** a readable subtitle on light skies.
- **Nightlight:**
  - A readable resting end card.
  - Mode chips that fit.
  - The landscape panel keeps the Mallow clear.

Each major has a check that catches it. The checks compare the rendered
pixels, the layout geometry and the particle state.

## Hosted preview
The link now serves Phase 3. The published bundle is built from the lab's
import graph (121 files, 5.7 MB): the lab, the read-only production modules it
imports (`src/mallows/*`, `src/world/*`, haptics, tokens) and the art.
`adapters/supabase-comfort.js` isn't imported, so it isn't published.

**The page makes no third-party requests.** The final gate pointed out that
earlier previews loaded the Fredoka font from Google Fonts, which shares every
visitor's address with Google. The published page now serves the lab's own
self-hosted copy of Fredoka (two small woff2 files) together with its SIL Open
Font License notice, exactly as the repository page does.

Every production file in the bundle was read in full before publishing. The
font licence and the font rules in `tokens.css` are new in this publish; no
other production file has changed since Phase 2. In the published copies
only, the brand is lowercased in two production code comments.

## Known issues and limits
- **No physical phone test yet.** Frame rates in this container use software
  rendering and mean nothing. Weather Weaver (a live realm plus weather
  layers) and a Hushbeat duet (two soft bodies and a realm) are the heaviest
  screens. 60 fps on a mid-range phone is unproven.
- **Tap-to-sound latency** in Hushbeat depends on the phone and on Bluetooth
  headphones. The engine adds no delay, but it can't remove the device's.
- **The iPhone silent switch** mutes Web Audio and can't be detected. The
  visuals carry each experience without sound.
- **Keep screen on** works only where the browser has a screen wake lock.
  Without it, a phone locks on its own timer, often 30 s, which ends the
  visible nightlight early. The sheet says so.
- **Landscape on a phone:** Hushbeat and Nightlight now frame the Mallow
  larger there. In Weather Weaver it is still small, because it is fitted to
  the screen height by the shared stage, and the chips sit close to it.
- **Visual polish to review on a phone.** Both QA passes improved Storm's
  thunderheads, the beams, puddles, ribbons and the rain deck. These still
  deserve a look on a real screen:
  - Starlight and Moonlight are close in colour when both arrive in the same
    cove.
  - Moonmilk Cove's moon is dim at low Nightlight brightness.
  - In portrait the Nightlight sheet covers the Mallow. The sky stays in view
    as the live preview, and landscape uses a side panel.
- **Production art the lab must not change**, worth a look by whoever owns
  `src/`:
  - Loomi's downward brows read as a second pair of closed eyes.
  - Boppo's and Pipzi's calm faces look a little smug at bedtime.
  - Realm clouds flatten into bars on very wide screens.
  - The desktop lily pads have stair-stepped edges.
  - Glitzi's squeeze glitch hides its whole face for a moment.
- **Product decisions left open:**
  - In Nightlight, changing Fade out restarts the timer from now. It now
    brings the light back up (documented in NIGHTLIGHT.md).
  - The Nightlight sheet is dense on a 320×568 phone. One option is folding
    Fade out into Timer, or moving rarer rows behind a "More".
- **Personality and music are my reading** of the seven characters. They
  need a product-owner pass, especially Zuzu's duets and each Mallow's
  instrument.
- **Double tap with real touch** still can't be delivered in this container.
  It is unit tested and on the phone checklist.
- **Haptics on iPhone:** browsers there have no vibration API.
- Unchanged from Phase 2: the Supabase adapter is tested only against a fake
  client; some production particle colours are pale on the light stage.

## Physical phone checklist (not yet done)
Open `http://<your-computer-ip>:8000/hushmallow/sensory-lab/index.html` on
the phone, on the same Wi-Fi (or the private link, signed in).

1. Phase 1 and Phase 2 checklists.
2. **Weather Weaver**, for each weather:
   1. Two-finger cloud parting.
   2. Catching rain with a resting finger: no callout or magnifier.
   3. A Safari edge swipe during a drag releases cleanly.
   4. Thunder feels like a soft swell.
   5. Lock and unlock during a storm: no burst of sound.
3. **Hushbeat:**
   1. Does a tap feel instant, through the speaker and through headphones?
   2. Is the bass warm on the phone speaker?
   3. Two thumbs on two Mallows in a duet.
   4. Locking mid-hum: nothing restarts by itself.
   5. Try the silent switch.
4. **Nightlight:**
   1. Lock for two minutes mid-session, and across the end: no bright frame
      on unlock, and the end view appears quietly.
   2. Audio after unlock, and after a call.
   3. Keep screen on holds and then lets go.
   4. Read the chrome in a dark room at minimum screen brightness.
   5. Battery over a 30-minute session per mode (report measured values only).
5. **Accessibility:** VoiceOver and TalkBack on all three (the dial, the hold
   buttons, the announcements, the sheets).
6. **Performance:** watch for dropped frames in Weather Weaver and a Hushbeat
   duet, then compare Settings → Quality → Low.
7. **Haptics:** on Android, a catch, a parting and a constellation buzz, and
   nothing buzzes when Haptics is off.

## Next milestone
**Phase 4: expressive and creative features**

- **Two Mallow Theatre.** Two Mallows act a short scene together. It builds
  on the duet stage, FaceMixer and the per-Mallow profiles from this phase.
- **Hushprints.** Creative keepsakes made from touch, with exports. It uses
  the Effects layer and the lab's local storage rules: optional, viewable and
  deletable.
- **All eight Theatre story categories**, with tests for interactions,
  exports and character reactions.

The brief doesn't ask for an approval stop here, but say if you'd like changes
to Phase 3 first. Phase 4 can start on "continue with phase 4".
