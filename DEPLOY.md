# Deployment

## GitHub

1. Open the existing `thinkstill-rituals` repository.
2. Upload the **contents of this folder to the repository root**.
3. Replace the older `manifest.json`, seven bubble JSON files and
   `ThinkStillUnifiedChat.tsx`.
4. Commit the changes.
5. Open the raw manifest URL and verify that it reports `version: FINAL`.
6. Run `npm run validate` locally or in GitHub Codespaces before release.

## Framer

Use the included `ThinkStillUnifiedChat.tsx` as the current code component.

The renderer is configured to show:
- emotional-distress guidance
- Goal once
- numbered ritual
- all five support lines
- one Win
- alternative ritual guidance when the first does not help
- Formula Flow
- collapsible Safety

Internal Hook / Goal / Game Move metadata must not be rendered.

## Important

Keep all JSON files and `manifest.json` in the same repository root unless you
also change `base_url` and the component's fetch paths.
