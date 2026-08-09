# Deployment

## GitHub

1. Open `ramkumarjothi1982/thinkstill-rituals`.
2. Upload every file from this package to the repository root.
3. Replace the previous manifest, seven bubble JSON files, validator and
   `ThinkStillUnifiedChat.tsx`.
4. Commit.
5. Open the raw `manifest.json` and verify:
   `version = TRUE_ONE_OF_ONE_LOCKED`.
6. Run `npm run validate`.

## Framer

Use `ThinkStillUnifiedChat.tsx` as the current Framer code component.

The renderer is wired to show the Friend Edition content and **not** show the
internal Goal separately.

## Rendering order

1. Emotional-distress cue
2. Title + play time
3. ThinkStill Friend Ritual + Steps
4. Friend Support
5. One-Line WIN
6. If This Ritual Doesn't Help
7. Formula Flow
8. Safety

## Data placement

Keep `manifest.json` and all seven bubble JSON files at repository root unless
you deliberately change the manifest base URL and the component's fetch paths.
