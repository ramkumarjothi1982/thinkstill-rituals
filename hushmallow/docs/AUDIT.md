# hushmallow — audit of the existing app (Phase 1)

What was in the repository before hushmallow V2, measured against the final
directive (two paid tiers, seven living Mallows, the Hushfold, no AI).

## What existed

| Area | Finding |
|---|---|
| App code | One ~930 KB minified bundle per release (`framer/release/thinkstill-release-*-v18/v19.js`), loaded by a Framer code file that is not in the repo. Header says "do not edit"; recent commits patched the minified output directly. |
| Characters | Seven "bubbles" (glitch, drop, still, patch, loopie, rush, sync) shown as 700 pre-rendered circular WebP portraits (`bubble-expressions/<bubble>_E01–E100.webp`) with glossy circular frames. Emotion = swapping one image for another. |
| Rituals | 1,000 authored text rituals (`rituals.json`, per-bubble files, `thinkstill-modes.json`) in a MISSION → RULE → MOVE → TWIST → MIND BEND → WHY format. Almost all are thinking-error tricks, i.e. reframing content. |
| Navigation | A "Release Console" with a 30-game launch build, console screens, previous/next console arrows, an emotion check-in. |
| Emotion coverage | Check-in moods mapped to a handful of states (`default`, `anxiety`, `shame`, `rumination`, `support`, `anger`). |
| Animation | CSS keyframes on whole images (breathing opacity, squash class), particles/bokeh layers. |

## Why it felt basic

1. **The characters couldn't act.** Expressions were whole-image swaps of
   circular portraits. Nothing about the face moved, and the circular frames
   and black masks fought the art.
2. **Dashboard, not a world.** Consoles, panels and game grids put software
   chrome between the person and the feeling.
3. **The library was one shape.** 1,000 rituals but essentially one
   interaction (read a card). They were also all reframing, which the final
   directive makes Ultra-only.
4. **The emotion vocabulary was tiny.** Six moods can't hold "jealous and
   ashamed of being jealous".
5. **It couldn't grow.** Every change meant re-editing a minified 930 KB file.

## Decisions taken

- **Build V2 as a separate, maintainable app** in `hushmallow/` (plain ES
  modules, no build step, PWA-ready, wrappable for the App Store). The old
  bundle is left untouched so the live Framer site keeps working until you
  switch. Nothing old is deleted.
- **Keep the 1,000 ThinkStill rituals.** They are adapted into hushmallow
  Ultra as quick perspective tricks, with legacy bubble ids mapped to Mallows
  (glitch→Glitzi, drop→Blubi, loopie→Zuzu, patch→Boppo, rush→Pipzi,
  sync→Loomi, still→Noomi).
- **Replace the circular portraits** with the seven approved transparent
  Mallows plus a real facial rig. The `bubble-expressions/` images are not
  used by V2.
- **One home, two paid experiences.** There are no Reset/Release/Reflect/
  Reframe consoles. Reframe exists only inside Ultra, as Another Angle.
- **No AI anywhere in the shipped app.** Feelings are matched against
  hand-written word lists, and the person confirms every suggestion.

## Broken or incomplete in the old app (not carried over)

- Manifest URL defaulted to blank, so the app threw "GitHub ritual library
  is required" unless configured in Framer (`UPLOAD_INSTRUCTIONS.txt`).
- Code-inserted prefixes ("One damn rule:", "Do this:") contradicted the
  clean copy in the ritual files (`GITHUB_UPLOAD_README.txt`).
- `expressions_manifest.json` describes 700 assets but upgrade notes
  describe 448 regenerated ones. The asset set had been patched piecemeal.
