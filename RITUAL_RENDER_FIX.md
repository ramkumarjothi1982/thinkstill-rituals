# FULL RITUAL RENDER FIX

This build fixes the missing-ritual problem by restoring compatibility with the established ThinkStill data contract.

## What changed

1. Added legacy Bubble filenames expected by older Framer/chatbot code:
   - rituals_glitch.json
   - rituals_drop.json
   - rituals_still.json
   - rituals_patch.json
   - rituals_loopie.json
   - rituals_rush.json
   - rituals_sync.json

2. Kept the newer bubble-*.json files too.

3. Every ritual now carries:
   - canonical snake_case fields
   - camelCase aliases
   - exact spreadsheet-column aliases
   - `Final Consumer Ritual`
   - `fullRitual`
   - `content`
   - nested `display` object

4. Added `ritual-normalizer.js` for Framer code that needs one normalized object before render.

## Expected consumer output

TITLE
GOAL
RITUAL
WIN
5 SUPPORTS
FORMULA FLOW
SAFETY

The UI should never replace a valid ritual title with the generic text `Mind Reset`.
