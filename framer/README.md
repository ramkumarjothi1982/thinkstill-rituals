# ThinkStill Release Arcade: Pixar / Viral / Hypnotic layer

`ThinkStillReleaseArcadePixar.tsx` wraps the Release Arcade and upgrades all 110 games at once.
It does not change any game logic.

## Install (Framer)
1. Keep your existing code file named **`ThinkStillReleaseArcade.tsx`** (the base component).
2. Add `ThinkStillReleaseArcadePixar.tsx` as a second code file in the same Framer project.
3. Put **ThinkStillReleaseArcadePixar** on the canvas instead of the original. All the original
   property controls carry over, plus three new ones: **Pixar Juice**, **Combo Pops** and **Pixar Intensity** (0–2).

## What it adds
- Pixar-style lighting on every thought bubble: rim light, bounce light, soft contact shadow and a breathing halo.
- Squash and stretch on every press (anticipation → squash → overshoot → settle).
- A tap burst of sparks, hearts and stars with a shock ring. Each burst gets bigger as your combo grows.
- Combo pops (NICE → SWEET → … → LEGEND ×N) and a small screen kick with haptics every 5 hits in a row.
- A cursor-following bloom and a slowly rotating hypnotic iris, shown only while a game is playing.
- A liquid shine running along the progress bar.
- Working versions of the base file's `GLOBAL_VIRAL_HYPNOTIC_ALL_GAMES_CSS` and `GLOBAL_PIXAR_CINEMATIC_ALL_GAMES_CSS`
  rules. Most of those selectors miss a descendant space (e.g. `.arena:is(button…)`, `.stage-play:is(.globalPlayGuide…)`),
  so they never match.

Respects `prefers-reduced-motion`. It never sets `filter` or `transform` on game objects, so the base
file's burst, blur and drag animations keep working.
