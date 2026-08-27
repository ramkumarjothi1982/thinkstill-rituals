# ThinkStill 750 — v13 FINAL RELEASE

This repository is the GitHub-ready package for the locked **ThinkStill 750 v13** ritual library and the current **ThinkStill Reset Console** Framer code component.

## Production files

Keep these runtime files together in the same GitHub folder:

- `ThinkStillUnifiedChat.tsx` — current Framer code component, updated for v13 `GOAL` ritual schema.
- `thinkstill-manifest-v13.json` — paste the **raw GitHub URL** for this file into Framer's **Manifest URL** property.
- `glitch.json`
- `drop.json`
- `loopie.json`
- `patch.json`
- `rush.json`
- `still.json`
- `sync.json`

The manifest uses relative filenames, so the seven Bubble files resolve automatically from the manifest location.

## Framer setup

1. Create or open the Framer Code Component used for the ThinkStill Reset Console.
2. Replace its code with `ThinkStillUnifiedChat.tsx`.
3. Push this repository to GitHub. A public repository is the simplest setup for direct browser loading.
4. Open `thinkstill-manifest-v13.json` on GitHub and choose **Raw**.
5. Copy the URL. It should look like:

   `https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/thinkstill-manifest-v13.json`

6. In Framer, select the ThinkStill component and paste that URL into **Manifest URL**.
7. Publish and test several issues such as panic, overthinking, rejection/social pressure, decision confusion, rumination, sleep, urges and getting started.

You do **not** need to enter URLs for the seven Bubble JSON files individually.

## Release architecture

The package contains:

- 750 globally unique ritual IDs (`TS-001` → `TS-750`).
- Seven semantic Bubble libraries.
- 22 broad router parents derived from the locked v13 `Best For` taxonomy.
- 73 precise `Best For` subpatterns.
- Global 750-ritual no-replay support in the v2000 semantic UI router.
- Explicit high-risk message gate: clear self-harm/harm/medical-emergency/reality-risk language is scoped to the workbook's `SUPPORT FIRST` pool before normal competitive routing.
- Exact locked v13 full ritual strings: `GAME → GOAL → ONE RULE → PLAY → TWIST → WIN → MIND BEND → SAFETY`.
- `SUPPORT FIRST` retained on the 25 escalation rituals, all with `RIGHT NOW` play time.

The generated routing fields are compatibility metadata only. They **do not rewrite the locked ritual text**.

## Important v13 UI compatibility fix

The previous UI source checked for a legacy `MISSION` heading before accepting a complete ritual string. v13 uses `GOAL`. `ThinkStillUnifiedChat.tsx` has been updated so the locked v13 full ritual is accepted directly and the connected ritual journey remains intact.

## Validation

Run:

```bash
npm run validate
```

The validator checks the runtime JSON files for release-critical deterministic invariants, including:

- manifest and Bubble file checksums;
- 750 unique sequential IDs;
- seven Bubble libraries and row totals;
- current engine fingerprint integrity;
- required ritual fields and sections;
- no `MISSION` or `PAUSE` blocks in final ritual output;
- no exact duplicates in core creative fields;
- zero repeated 4-word fragments in each core field and Mind Bend;
- zero repeated 10-word Safety fragments;
- zero corresponding Game Name echoes in Mind Bend/Safety;
- zero corresponding Goal echoes in Safety;
- Support First count and `RIGHT NOW` timing;
- the TS-499 Rule↔Safety count contradiction regression;
- v13 UI `GOAL` full-ritual compatibility and high-risk `SUPPORT FIRST` gate presence;
- TS-474 mental/oral play regression.

A GitHub Actions workflow is included at `.github/workflows/validate.yml` and runs the same validator on pushes and pull requests.

## Reference / audit files

- `rituals-v13.json` — combined 750-ritual JSON, convenient for analysis or backend import.
- `route-map-v13.json` — generated 22-parent / 73-subpattern routing map and counts.
- `release-v13.json` — frozen v13 release metrics.
- `schema-v13.json` — data contract for individual ritual records.
- `source/ThinkStill_750_v13_FINAL_RELEASE_PERMANENT_10of10.xlsx` — locked source workbook.

## Freeze rule

The source workbook is the content authority. Do not casually edit JSON ritual copy directly in GitHub. If a real production defect is found, fix the source master first, regenerate the package, and run the validator again.


### Routing release note — v38.11
The Framer source includes the v2000 semantic router. Natural-language issue nouns are translated into the workbook’s canonical routing vocabulary before scoring; for example, `drugs`, `weed`, `alcohol`, `vaping`, and `relapse` route into **Urges / Habit Loops** unless an immediate alarm or SUPPORT FIRST condition takes priority.
