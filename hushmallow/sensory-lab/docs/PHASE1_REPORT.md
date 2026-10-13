# Phase 1 report: foundation, Mallow TouchTalk, SoftBody Lab

**Status:** built and tested in Chromium at phone, Android and desktop sizes.
It has **not yet been tried on a physical phone** (see the checklist below).
It is waiting for your visual approval before Phase 2.

| | |
|---|---|
| Branch | `claude/epic-mendel-3lfmuy` |
| Base commit | `57c0a5d38ceeb06ce78ed27e6eec2f6da57108ef` (main) |
| Hero Mallow | Boppo. All seven load through the same code (`?mallow=<id>`), but only Boppo is tuned. |
| Production files changed | **none**. Everything is under `hushmallow/sensory-lab/`. |

## What is actually built

### Shared sensory engine (`core/`)
- **SoftBody Physics Engine.** This is a real 2-D XPBD spring mesh (about
  80–220 nodes) laid over the approved artwork's silhouette, not scaling of
  the PNG. It has distance, bending and triangle-area (incompressibility)
  constraints, shape memory, rubber-band finger grabs, pokes, strokes and a
  floor with friction, and it stays stable at any frame rate.
- **SoftMallow.** It subclasses the production `MallowRig` read-only. The
  approved art, animated face, expressions, signature particles and authored
  reactions are unchanged. The skin is drawn through the deformed mesh in
  WebGL, with a light/shade term from the local compression, and falls back to
  Canvas 2D. The rig's own hops, squash beats, breathing and lean drive the
  mesh pose, so everything gains follow-through.
- **Gesture Engine.** Tap (instant), double tap, hold, stroke (back and
  forth, or sweeping onto the body), drag, fling, release and two-finger
  squeeze or spread. It also tracks tap streaks and rhythm. Pointer Events
  with capture are used, iOS scroll and long-press are suppressed, and
  events and frames share one clock.
- **Character Personality Engine.** Deterministic and seeded, with no AI
  calls. It takes into account the gesture, duration, rhythm, speed, recent
  history, a drifting mood and the Gentle / Balanced / Playful setting.
  Repeated taps escalate from a hello to giggles to dizzy; a steady rhythm
  makes the Mallow groove; the same tap answer never comes twice in a row.
  Each of the seven Mallows has a profile.
- **Expression Engine.** Transient faces layer over a resting face set by the
  Mallow's mood. The face follows the body: squeezing blends in that Mallow's
  authored `squeezeFace` (squint, puffed cheeks), stretching widens the eyes
  and makes an "ooh" mouth, and wobbling adds a flustered look.
- **Sound Engine.** All sound is Web Audio synthesis with no files. Material
  sounds cover poke, squish, stretch creak (continuous), release boing,
  floor impact and the settle sigh. Mallow voices cover tap melodies, giggle,
  coo, hum, surprise, content and grumble, using each Mallow's own root note
  and scale from the main app. Nothing plays before a gesture. Voices are
  capped and cleaned up, and sound suspends when the page is hidden.
- **Preferences.** The lab has its own `hm.sensorylab.v1` store (sound,
  volume, haptics, motion, theme, quality, response style, material).
- **Adaptive quality.** It picks a starting tier for the device and steps
  down a tier if frames stay slow.

### Mallow TouchTalk
Every required interaction works on Boppo: tap (looks at your finger, dents
the surface, and answers in varied ways), double tap (bounces), press and hold
(settles into slow breathing, nuzzles your finger, sinks in a little), stroke
(leans into your hand and goes soft-eyed; fast strokes tickle), squeeze (a
two-finger pinch, or the single-touch alternatives below), drag (stretches
toward your finger with elastic resistance), release (springs back with
momentum, then settles) and repeated interactions (the answers change).
Single-touch squeeze alternatives are pressing down on the Mallow, the
Squeeze button (press and hold) and the S key. A "Use buttons" tray and
keyboard keys cover every gesture.

### SoftBody Lab
There are five materials, each with different physics and sound:
Marshmallow (very soft, slow to recover), Jelly (elastic wobble), Mochi
(stretchy, about 2.5× Jelly's stretch), Cloud (buoyant, floats) and Pillow
(deep, compressible). A Squish (hold) button and Stretch / Poke buttons are
included. The **mesh toggle** draws the live wireframe so you can see that
the artwork itself deforms.

## Tests

| Suite | Result |
|---|---|
| `node --test hushmallow/sensory-lab/tests/*.test.mjs` (physics, gestures, personality, expression, prefs) | **28 / 28 pass** |
| `node hushmallow/sensory-lab/tests/e2e.cjs` (Chromium; 390×844, 375×812, 320×568, 412×915 Android, 1280×860) | **268 / 268 pass** (`docs/phase1/e2e-results.json`) |
| Main app tests (`node --test hushmallow/tests/*.test.mjs`) | **69 / 69 pass** (unchanged; this folder isn't in their scope) |

For every viewport, the browser suite checks the following. Recognition: tap,
double tap, hold, stroke, drag, release and pinch (touch sizes) are recognised
from real input. Physics: a tap dents the body, a drag stretches it, a pinch
compresses it, and it returns to shape. The Mallow looks at the finger. The
gesture buttons and keyboard keys work. Each material is applied, Mochi
stretches more than Jelly, Jelly rebounds more than Marshmallow, and Cloud
floats. Layout: controls don't overlap each other or the Mallow, touch targets
are at least 38 px, there's no horizontal scroll, and the Mallow is fully
visible. The simulation pauses when the page is hidden and resumes. Reduced
motion reaches the physics and the light theme applies. Switching screens 12
times leaks no canvases or screens. There's no audio before a gesture, every
sound voice is cleaned up, and mute silences the Mallow. There are no console
errors, and the lab writes only its own storage key.

**About the double-tap check.** On touch viewports it dispatches real
`PointerEvent`s (pointerType `touch`) in the page. In this container,
Chromium renders with software GL, and its slow frames delay how quickly
DevTools touch events arrive, so a fast double tap can't be delivered that
way. The recogniser and its timing are also unit tested. Double tap on a
physical phone is still listed in the checklist below.

Screenshots for every viewport are in `docs/phase1/`. The demo video was
recorded with simulated input at 390×844.

## Known issues and limits
- **Only Boppo is tuned.** The other six run through the same code and look
  right in quick previews, but their softness, framing and per-Mallow
  reactions need a tuning pass (Phase 2). Closed-eyed Mallows (Blubi, Loomi,
  Noomi) only open their eyes for big stretches, by design.
- **The mesh toggle shows grid corners** outside the silhouette. They're
  invisible in normal view (transparent texture).
- **Performance numbers are unmeasured on real hardware.** The headless
  container uses software rendering, so its frame rates mean nothing. The
  physics costs about 0.5 ms per frame at the high tier in Node. A 60 fps
  claim needs a phone test.
- **Haptics:** these use the main app's haptics helper. They work on Android
  Chrome; iPhone browsers have no vibration API, so iPhone needs the native
  wrapper.
- **Sound:** the lab's volume and mute are separate from the main app's.
  They'll share one preference at integration.

## Physical phone checklist (not yet done)
Open `http://<your-computer-ip>:8000/hushmallow/sensory-lab/index.html` on
the phone, on the same Wi-Fi.

**iPhone (Safari):**
1. Tap, then double tap quickly. The second tap should bounce.
2. Hold a finger still for 2 s. No text-selection or callout menu should
   appear, and the page shouldn't scroll.
3. Two-finger pinch on Boppo. Safari shouldn't zoom the page.
4. Drag up hard and fling. Boppo should spring back with no jank.
5. With the ring/silent switch on and off, sound should start only after
   your first touch.
6. Lock the screen mid-wobble, then unlock. The animation should resume and
   no sound should be stuck.
7. Try Settings → Quality → High, and compare with Auto.

**Android (Chrome):** steps 1–7, plus: haptics are felt on tap, squeeze and
release, and turning Haptics off stops them.

**Both:** reduced motion (system setting) calms the movement, and the light
theme is readable.

## Next milestone (after your approval)
Phase 2: tune TouchTalk and SoftBody for all seven Mallows, finish Comfort
DNA (full preferences, privacy controls, the persistence adapter interface
and draft Supabase fields), and build all six Pocket Hush modes.
