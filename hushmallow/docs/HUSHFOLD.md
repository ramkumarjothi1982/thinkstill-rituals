# The Hushfold vertical slice

What this branch adds, labelled honestly as **implemented**, **tested** or
**planned**. "Tested" means driven end to end in headless Chromium with real
touch events (Chrome DevTools touch input, WebGL through SwiftShader) at
375×812, 390×844, 430×932 (with reduced motion) and 1280×800, plus the
automated tests in `tests/hushfold.test.mjs`. It has **not** been tried on a
physical phone or with people yet.

## How to run it

```bash
# from the repository root
python3 -m http.server 8000
# app:        http://localhost:8000/hushmallow/index.html
# touch lab:  http://localhost:8000/hushmallow/touch-lab.html?m=glitzi
```

On `localhost` the plans screen grants test purchases with no charge, so you
can choose Flow or Beyond to get past the "Tell" gate.

## What happens

1. **Open the app.** A Mallow is right there and is immediately squeezable.
   Arrows under it switch between all seven.
2. After a moment of play the Mallow invites you in subtitles ("Something
   bothering you?") with **Tell {name}** and **Just squishing**.
3. **Tell** opens a compact bar: optional feeling chips and one line of text
   (160 characters, keyboard dictation works). Your words become a **Thought
   Mallow** with your exact text above it. Crisis language opens the free
   support screen instead of a game.
4. **Hushflow** picks worlds from your feeling and intention. For *angry*:
   Static Storm, then Luminous Ocean, then a Moonmilk Cove rest stop.
5. **Glitzi's Static Storm.** Fast drawing throws lightning and charges the
   storm. Slow drawing lays light ribbons that discharge your thought. Once
   you've felt both: "See what happened? / You changed your pace. / The world
   responded." Then you're offered **The Power of Slowing Down** for the
   Memory Garden (ripple, charm, portal, "New tool saved" card).
6. The storm **melts** into **Loomi's Luminous Ocean**. Slow sweeps raise
   long swells that carry your thought (and any photos you added) out
   towards the horizon. Fast sweeps just chop the water. "Still there. Just
   not right in your face." Then you're offered **Making Room**.
7. **Auto-flow** carries on to the rest stop, or you get Continue / Stay
   here / Finish.

You can pause, finish, switch feeling or intention, stay in a world,
favourite it, change subtitle speed, add or remove photos, or open the
Memory Garden at any time from the top bar or the Hushflow panel.

## Implemented

| Area | Where | Notes |
|---|---|---|
| MallowTouch soft body | `src/hushfold/touch/` | Lattice soft body (press depth from hold time and contact size, two-finger stretch, pull with elastic limit, rebound wobble, flick, jiggle, massage circles, calming strokes, slip-away). WebGL mesh renderer with a Canvas 2D fallback. Faces, sounds, haptics and particles come from the existing Mallow rig. |
| Thought Mallow | `src/hushfold/thought-mallow.js` | Shows your exact words. Its style follows the feeling chip (crackle, tremble, heavy, crowd, puff, small, bounce). You can drag it. |
| Subtitles | `src/hushfold/subtitles.js` | One short line at a time at the top, away from Mallow faces. Fade in, no typewriter, glow or bounce. Reading time follows length and the speed setting. Pause, replay, skip. Play never stops. |
| Static Storm | `src/hushfold/worlds/static-storm.js` | Pace measured on the event clock. At most 3 bright bursts a second. Reduced motion turns bolts into soft glows. |
| Luminous Ocean | `src/hushfold/worlds/luminous-ocean.js` | Perspective ocean with moon path, tide, ripples and spray. A "Bring it closer" button brings your thought back. |
| Moonmilk rest stop | `src/hushfold/worlds/moonmilk-rest.js` | Deliberately simple, with nothing to complete. |
| World registry | `src/hushfold/data/worlds.js` | Every field from the brief. Planned worlds have no module and are never offered. |
| Memory Garden | `src/hushfold/garden.js` | Installation animation, then a garden sheet with tool details, "Try it in real life", evidence notes and Practise again. |
| Hushflow | `src/hushfold/flow.js`, `panel.js` | Deterministic planning, resume, favourite. Words are only stored if "Keep my words" is on. |
| Flow and Beyond | `src/app/entitlements.js`, `scenes/plans.js` | Renamed in the UI only. Internal ids `paid`/`ultra` and all four App Store product ids are unchanged. `planName()` is the display adapter. Monthly and annual options. |
| Typography | `src/ui/tokens.css`, `assets/fonts/` | Nunito Sans (Mallow voice), Manrope (interface), Fraunces (cinematic moments), self-hosted woff2 under the OFL. Central size tokens (nothing below 13px), metric-matched fallbacks so fonts swap in without layout shift. The supplied logo artwork is used as-is on a light plate. |
| Old home | `#rituals` route | The previous home (rituals and library) is still there, reachable from the panel under More. |

## Tested

- `node --test hushmallow/tests/*.test.mjs`: 84 tests pass (66 existing, 18
  new). The new tests cover soft-body press and rebound, the elastic limit,
  gesture classification, squeeze depth, Hushflow planning, word privacy,
  registry completeness, the storm's fast-then-slow discovery, Flow/Beyond
  names and product ids, annual purchase routing, and self-hosted fonts.
- End to end at four sizes: squeeze → invite → tell → storm → discovery →
  skill saved → ocean → swells carry the thought → second skill saved →
  auto-flow to rest → panel → pause → finish. No console errors, no failed
  requests, no horizontal scroll.

**Headless limitation:** SwiftShader is slow enough that synthetic touch
can't move fast enough to count as fast drawing, so the end-to-end runs hit
the gentle discovery path. The fast-then-slow path is covered by the unit
test with a controlled clock.

## Planned (not built)

- The other worlds in the registry: Thought Aquarium, Silent
  Constellation, The Pause Bridge, Kind Hands, One Point.
- Belief Mallows to investigate (Beyond).
- Perspective worlds built for Another Angle.
- A Mallow-voiced microphone. It was left out on purpose: browser speech
  recognition sends audio to a server. Keyboard dictation works instead.
- Higher-resolution Mallow art. The rig uses the existing ~400px layers
  derived from the approved art. The 1254px uploads would need their face
  coordinates re-measured.
- Playtesting on physical phones and with people.
