# ThinkStill v17.2 — Intent-Aware Full-Ritual Router

This release fixes the two issues visible in the previous chatbot build:

1. The opening support language now follows the user's detected issue (panic, anger, shame, looping, heaviness, stuckness, confusion, fear), not the selected Bubble.
2. The chatbot now renders the complete ritual from the `USER RITUALS` workbook fields instead of a shortened preview string.

## Upload to GitHub

Replace the existing repository files with every file in this folder:

- `manifest.json`
- `rituals_glitch.json`
- `rituals_drop.json`
- `rituals_still.json`
- `rituals_patch.json`
- `rituals_loopie.json`
- `rituals_rush.json`
- `rituals_sync.json`
- `ThinkStillUnifiedChat_v17_2_IntentAwareFullRitualRouter.tsx`

The JSON files and `manifest.json` must remain in the same GitHub folder.

Use this manifest URL in Framer:

`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json`

Replace the Framer code component with:

`ThinkStillUnifiedChat_v17_2_IntentAwareFullRitualRouter.tsx`

## Behaviour

- User enters an issue, emotion, feeling, or situation.
- The engine ranks the 22 parent thinking errors and 63 precise subpatterns.
- It selects the weighted best globally unused ritual.
- Re-entering the same issue advances through unused rituals in that route.
- No ritual repeats until all 400 have been served.
- Bubble identity remains visual only; users cannot select it.
- Internal `SUBPATTERN:` lines are hidden from the displayed ritual.
- Full title, trigger, play time, goal, why, game move, steps, win, reward, formula flow, safety, and return cue are displayed.

## Clean testing

This build uses new `v172` browser-storage keys, so earlier v17 testing history does not affect the new 400-ritual cycle.
