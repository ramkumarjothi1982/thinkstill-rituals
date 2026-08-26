# ThinkStill v7 — GitHub + Framer Exact Ritual Format

This package is built from `ThinkStill_750_v7_SOURCE_OF_TRUTH.xlsx`.

## Framer output format

Every normal ritual renders in this exact section order:

GAME
RANDOM INTERRUPT

MISSION
Interrupt a predictable chain with an unrelated generated item.

ONE RULE
Use a neutral absurd object.

PLAY
When a familiar spiral reaches link two, deliberately picture a purple bicycle for one beat, then stop generating anything.

TWIST
Do not use the bicycle as reassurance.

WIN
The usual chain loses its uninterrupted continuity.

MIND BEND
A harmless random insertion can derail an apparently inevitable chain, revealing that mental sequence depends on adjacency more than it feels like it does.

SAFETY
RANDOM INTERRUPT is limited to a brief thought sample. Interrupt a predictable chain with an unrelated generated item. If you notice greater thought preoccupation, close RANDOM INTERRUPT and look at something real nearby.

The 25 SUPPORT FIRST rituals show `SUPPORT FIRST` after `SAFETY`.

## Files to upload to GitHub

Upload all files in this folder to the same repository folder. The Framer component only needs the raw URL of `manifest.json`; it discovers the 7 bubble JSON files beside it.

Core runtime files:
- `manifest.json`
- `rituals_glitch.json`
- `rituals_drop.json`
- `rituals_loopie.json`
- `rituals_patch.json`
- `rituals_rush.json`
- `rituals_still.json`
- `rituals_sync.json`
- `ThinkStill_UnifiedChat_v38.4.7_EXACT_FORMAT_v7_SAFETY.tsx`

Audit/reference files:
- `rituals_all.json`
- `routing.json`
- `SCHEMA.json`
- `PACKAGE_AUDIT.json`
- `CHECKSUMS.sha256`
- `ThinkStill_750_v7_SOURCE_OF_TRUTH.xlsx`

## Framer setup

1. Upload/commit the GitHub files.
2. Open the raw GitHub URL for `manifest.json`.
   Example pattern:
   `https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/manifest.json`
3. Paste the complete contents of `ThinkStill_UnifiedChat_v38.4.7_EXACT_FORMAT_v7_SAFETY.tsx` into one Framer Code Component.
4. In Framer properties, paste the raw `manifest.json` URL into **Manifest URL**.
5. Keep your existing avatar, video, music and X/Y property settings.

## What changed from v38.4.6

The previous renderer converted legacy game fields into `GOAL + numbered STEPS`.
This release adds a v7 exact-format fast path and renders the workbook source directly:

`GAME → MISSION → ONE RULE → PLAY → TWIST → WIN → MIND BEND → SAFETY`

No MISSION/RULE/PLAY/TWIST-to-Steps conversion is applied to v7 full rituals.

## Safety

- 750/750 rituals have a nonblank `safety` field.
- Safety is ritual-specific, not one universal disclaimer.
- 25/750 also retain a `SUPPORT FIRST` section.
- The TSX preserves `SAFETY` and `SUPPORT FIRST` from `full_ritual`.
