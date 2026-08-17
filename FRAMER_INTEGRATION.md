# Framer integration — v58.20.5

Use the raw GitHub URL for `manifest.json` as the data entry point.

Example:

`https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/refs/heads/main/manifest.json`

`ThinkStillData.ts` loads the manifest and resolves all other JSON files relative to it.

The package does not require changing your existing chat UI. Keep the existing UI and replace only the ritual data source / manifest URL.

Consumer field mapping:

- `title` → Ritual Name
- `playTime` → Play Time
- `goal` → Goal
- `steps[]` → Numbered Steps
- `win` → WIN
- `mindBend` → Mind Bend
- `formulaFlow` → Formula Flow
- `safety.raw` → Safety
- `feedback.prompt` → Feedback Prompt
- `feedback.options[]` → Feedback Options
- `bubble` → automatic visual Bubble

Do not render `rituals.backend.json` fields in the ritual card.
