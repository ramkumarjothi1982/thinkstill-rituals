# ThinkStill 750 — Framer + GitHub fixed package

This package repairs both failures visible in the screenshots:

1. The manifest used `"base_url": "./"`, so Framer fetched `./rituals_glitch.json` from the Framer page instead of the GitHub repository.
2. The Framer component turned that loading error into an empty “Ritual Unlocked” card and still displayed feedback buttons.

The replacement component now keeps the app on the input screen and shows a clear loading error. It never unlocks a ritual or feedback controls unless a complete ritual was selected.

## Immediate hotfix

If the other files are already in the repository root, replace only `manifest.json` first. Its `base_url` now points directly to the GitHub raw folder. Then publish Framer again.

For the durable fix, also replace the Framer component. The component now resolves relative manifest paths against the manifest location, so this class of 404 cannot return.

## Upload to GitHub

Upload the **contents of this folder directly into the root** of:

```text
rankumarjothi1982/thinkstill-rituals
```

The root of the repository must contain:

```text
manifest.json
rituals_glitch.json
rituals_drop.json
rituals_loopie.json
rituals_patch.json
rituals_rush.json
rituals_still.json
rituals_sync.json
ThinkStillUnifiedChat.tsx
```

Do not upload the outer folder as a nested folder. The manifest must be at the repository root because the component uses:

```text
https://raw.githubusercontent.com/rankumarjothi1982/thinkstill-rituals/main/manifest.json
```

## Replace the Framer component

1. Open the existing ThinkStill code component in Framer.
2. Select all old code.
3. Paste the complete contents of `ThinkStillUnifiedChat.tsx` or the identical `ThinkStillUnifiedChat_COPY_PASTE.txt`.
4. Save the component.
5. Keep **Manifest URL** at its included default value.
6. Publish the Framer project again.

## What now displays

Every selected ritual visibly contains, in order:

- ritual name;
- play time;
- Goal;
- every numbered step;
- one WIN line;
- all five tips;
- Mind Bend;
- Formula Flow; and
- one Safety section beginning with PAUSE.

`BETTER / A LITTLE / NOT YET` appears only after a real ritual. A LITTLE and NOT YET continue to a different globally unused ritual. The no-repeat history persists in browser storage and resets only after all 750 IDs have been served.

## Verify before uploading

With Node.js installed, run:

```bash
npm run verify
```

The package should report 750 unique complete rituals, seven bubble files, a valid panic pool and no empty-card fallback.
