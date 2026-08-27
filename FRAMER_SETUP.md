# Framer deployment — ThinkStill Reset Console v13

## 1. Code Component

Paste the complete contents of `ThinkStillUnifiedChat.tsx` into one Framer Code Component file.

This is based on the final customer UI with:

- no initial prompt/orb before the user enters an issue;
- unified `ThinkStill Reset Console` branding;
- connected GOAL → ONE RULE → PLAY → TWIST → WIN → MIND BEND journey;
- PREVIOUS / NEXT ritual navigation;
- ENTER kept independent for a new issue;
- transition video support;
- global no-replay cycle;
- v1900 competitive routing.

## 2. Manifest

Push the repository, then use the raw URL of:

`thinkstill-manifest-v13.json`

Example:

`https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/thinkstill-manifest-v13.json`

Paste it into the component's **Manifest URL** field.

## 3. Runtime data

The following must remain next to the manifest:

`glitch.json`, `drop.json`, `loopie.json`, `patch.json`, `rush.json`, `still.json`, `sync.json`.

The manifest resolves these paths relative to itself.

## 4. Verify before publish

Run `npm run validate`, then test at minimum:

- “I am panicking and my heart is racing”
- “I keep replaying what happened”
- “I feel rejected and judged”
- “I cannot decide what to do”
- “I keep overthinking everything”
- “I cannot get started”
- “I cannot sleep because my mind is busy”
- “I have a strong urge and need a pause”

Check that rituals load, the selected Bubble changes naturally, NEXT does not immediately replay the same ritual, and the full v13 section order is preserved.
