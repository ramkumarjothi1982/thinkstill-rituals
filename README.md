# ThinkStill Rituals — GitHub Package

This repository contains the complete **400-ritual ThinkStill library** and the **Framer chatbot component**.

## Files

- `manifest.json` — main URL to paste into the Framer component
- `glitch.json` — 58 rituals
- `drop.json` — 57 rituals
- `loopie.json` — 57 rituals
- `patch.json` — 57 rituals
- `rush.json` — 57 rituals
- `still.json` — 57 rituals
- `sync.json` — 57 rituals
- `ThinkStillUnifiedChat.tsx` — Framer code component
- `validate.js` — checks file counts, IDs, titles and required fields

## Correct manifest URL

```text
https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/manifest.json
```

Do **not** use `/refs/heads/main/` in the raw URL.

## Upload to GitHub

1. Open the `thinkstill-rituals` repository.
2. Upload every file in this folder directly into the repository root.
3. Commit the files to the `main` branch.
4. Open the raw manifest URL above.
5. In Framer, paste that URL into the chatbot's **Library / Manifest URL** property.

## Validate locally

```bash
npm run validate
```

Expected result:

```text
PASS: 400 rituals across 7 Bubble files.
```

## Data format

Each Bubble JSON file has:

```json
{
  "schema": "thinkstill-ritual-library-v17.2",
  "version": "17.2",
  "bubble": "GLITCH",
  "count": 58,
  "rituals": []
}
```

The chatbot supports this wrapped `rituals` array format and uses the manifest to load all Bubble files.
