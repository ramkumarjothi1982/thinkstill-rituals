# v38.12.1 HOTFIX

- Share Reveal embeds the deep link directly in message text for Outlook/Windows share targets.
- DID IT SHIFT? has immediate in-memory UI state, strong selected styling, and confirmation copy.
- Locked ritual wording remains unchanged.

# ThinkStill v38.12 Growth QA

Core ritual content remains v13 and is unchanged. This QA covers the growth layer only.

## Implemented

- 50 curated `first_session_pick` rituals with ranks 1–50.
- First-session boost is active only for the first 3 normal serves and only when the ritual's parent route is already inside a close relevance band.
- High-risk / `SUPPORT FIRST` handling bypasses the first-session boost.
- `DID IT SHIFT?` records one revisable 0–3 rating per ritual signature in local storage.
- Reset DNA is derived only from those user ratings and is shown after 3 ratings.
- Adaptive routing boost is bounded to ±14 points and therefore cannot replace semantic relevance.
- `SHARE REVEAL` generates a 1080×1920 Mind Bend card; user challenge text is not included.
- Shared URLs use `?try=TS-xxx` and open the exact ritual directly.
- Shared deep-link trials still preserve the 750 no-repeat bookkeeping.
- Unseen-reset count is shown from the current no-repeat cycle.
- Growth events are stored locally and emitted as `thinkstill:growth` CustomEvents; challenge text is excluded.

## Validation completed

- 750 rituals loaded from all seven Bubble files.
- IDs TS-001 through TS-750.
- 50/50 first-session pick ranks present.
- 750/750 Reset DNA family tags present.
- 22 routing parents / 73 precise subpatterns preserved.
- 25/25 SUPPORT FIRST rituals remain RIGHT NOW.
- Existing v13 uniqueness and fingerprint gates still pass.
- TSX syntax transpilation passes with TypeScript.

## Production smoke test

1. Set Manifest URL to the raw `thinkstill-manifest-v13.json` URL.
2. Set Share Base URL to the published production page.
3. Clear local storage or use a private browser window.
4. Test first-session entries: overthinking, panic, breakup, drugs/craving, job interview, cannot sleep.
5. Confirm routing relevance before looking for a curated first-session pick.
6. Complete a ritual and rate all four shift options across repeated tests.
7. After 3 rated rituals, open Vault and verify Reset DNA appears.
8. Use SHARE REVEAL on mobile; confirm the image contains no private challenge.
9. Open the generated `?try=TS-xxx` link in another browser and verify the exact shared ritual loads.
10. Confirm `npm run validate` passes before deployment.
