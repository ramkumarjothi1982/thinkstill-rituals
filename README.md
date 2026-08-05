# ThinkStill v17 — GitHub-ready ritual library

This package replaces the previous ritual library with `ThinkStill_400_FINAL_NO_REPLAY_NO_LEVELUP(2).xlsx`.

## Library model
- 400 rituals
- 22 user-facing thinking errors
- 63 precise subpatterns
- Bubble counts: Drop 57, Glitch 58, Loopie 57, Patch 57, Rush 57, Still 57, Sync 57
- No ritual repeats until all 400 rituals have been served
- After complete exhaustion, the global pool resets
- No manual Bubble selector

## Routing sequence
1. Normalise the user's issue into a stable issue fingerprint.
2. Rank the 22 parent thinking errors.
3. Within the leading parent, rank its precise subpatterns.
4. Select the highest-scoring globally unused ritual, using the workbook routing weight to break close matches.
5. Repeated/similar entries continue through unused rituals in that precise subpattern.
6. When the subpattern is exhausted, advance to the next matched subpattern.
7. When the parent error is exhausted, advance to the next matched parent error.
8. Reset only after all 400 ritual IDs have been served.

## GitHub upload
Upload `manifest.json`, all seven `rituals_*.json` files, and the `.tsx` component to one public GitHub folder. In Framer, set **Manifest URL** to the raw URL for `manifest.json`.

Example:
`https://raw.githubusercontent.com/USERNAME/REPOSITORY/main/thinkstill-v17/manifest.json`

The Excel file is included as the editable source library. The chatbot loads the JSON files, not the `.xlsx` file directly.
