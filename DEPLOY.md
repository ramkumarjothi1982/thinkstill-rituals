# Deployment

## GitHub

1. Open `ramkumarjothi1982/thinkstill-rituals`.
2. Upload every file from this ZIP/folder to the repository root.
3. Replace the old manifest, seven bubble JSON files and chatbot component.
4. Commit.
5. Open the raw `manifest.json` and confirm `version` is `v37.9`.
6. Run `npm run validate`.

## Framer

Use `ThinkStillUnifiedChat.tsx`.

The component renders the locked consumer order:

1. Title
2. Play time
3. Goal
4. Numbered ritual cards
5. One-of-one WIN
6. Five plain support moves
7. Formula Flow
8. Collapsible Safety

Do not render backend-only distress/fallback copy in this release.

## File placement

Keep `manifest.json` and the seven bubble JSON files in repository root unless you also
change the manifest `base_url` and component fetch paths.
