# ThinkStill v58.20.7 — FINAL GitHub Package

This folder is generated from **ThinkStill_750_v58_20_7_FINAL_RELEASE_LOCK_MASTER.xlsx**.

## Upload

Upload **every file in this folder to the root of your GitHub repository**. Keep the JSON filenames unchanged.

If you continue using the existing repository from earlier ThinkStill builds, the Framer manifest URL is:

`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json`

For another repository, use:

`https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/refs/heads/main/manifest.json`

The Framer component also normalizes standard GitHub `blob` URLs to raw URLs.

## Files required by Framer

- `manifest.json`
- `rituals_glitch.json`
- `rituals_drop.json`
- `rituals_still.json`
- `rituals_patch.json`
- `rituals_loopie.json`
- `rituals_rush.json`
- `rituals_sync.json`
- `ThinkStill_UnifiedChat_v58_20_7_FINAL_RELEASE.tsx`

A `.txt` copy of the Framer component is included for easy copy/paste.

## Additional release files

- `rituals.json` — all 750 rituals in one file
- `routing.json` — canonical routing map for every ritual
- `thinking-errors.json` — 22 parent thinking errors
- `patterns.json` — 63 precise subpatterns
- `SCHEMA.json` — JSON schema for a ritual row
- `PACKAGE_AUDIT.json` — package-level integrity checks
- `ThinkStill_750_v58_20_7_FINAL_RELEASE_LOCK_MASTER.xlsx` — locked source/archive
- `CHECKSUMS.sha256` — SHA-256 integrity hashes

## Production contract

- 750 unique ritual IDs
- Bubble counts: GLITCH 108; DROP 107; STILL 107; PATCH 107; LOOPIE 107; RUSH 107; SYNC 107
- 22 canonical thinking errors
- 63 canonical precise subpatterns
- automatic routing only; no manual bubble selector
- intent gate is active
- routing accuracy is primary
- recent bubble/subpattern penalties add variety only among close-quality matches
- no ritual repeats until all 750 unique ritual IDs have been served; then the browser-local cycle resets
- Tier-3 support rows retain protected controls
- visible card: Title → Play Time → Goal → Ritual → WIN → Mind Bend → Formula Flow → Safety
- the archived five Tips remain in JSON/source data but are not rendered by the normal consumer card

## Bubble language

- GLITCH — signal / static / distortion / interference
- DROP — weight / load / burden / release
- STILL — quiet / anchor / stillness / steady
- PATCH — patch / mend / repair / reconnect
- LOOPIE — loop / cycle / echo / orbit / unhook
- RUSH — surge / charge / momentum / traction / redirect
- SYNC — align / calibrate / rhythm / timing / sequence

## Framer

Replace the current code component with:

`ThinkStill_UnifiedChat_v58_20_7_FINAL_RELEASE.tsx`

Then set its **Manifest URL** property to the raw `manifest.json` URL above.

The included component uses router storage version `v1900`, includes the panic/STILL diversity fix, loads all seven bubble libraries, uses the full 750-ritual no-repeat pool, caps the Vault at 750 saved rituals, and keeps overlay video media constrained inside the chat UI.

## Overlay videos

Overlay video files themselves are not included in this package because the Framer component receives overlay assets/URLs through its Framer property controls. Your existing selected overlay assets can stay connected after you replace the component.

## Important deployment note

Browser no-repeat history is stored in `localStorage`, so it is device/browser-local. Cross-device/account-wide history requires persisting served ritual IDs in your authenticated backend.
