# ThinkStill 750 — v13 CORE + Growth Layer v1

This repository is the GitHub-ready package for the locked **ThinkStill 750 v13** ritual library and the current **ThinkStill Reset Console** Framer code component, now with the v38.12 growth layer.

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

## v38.12 growth layer

The v13 ritual copy remains locked. Growth metadata and UI behavior are layered around it:

- **Top-50 first-session curation:** 50 high-impact rituals are tagged with `first_session_pick` and rank metadata. For the first three normal serves, the router gives these rituals a relevance-safe boost; semantic routing and `SUPPORT FIRST` safety still take priority.
- **Share Reveal:** after a ritual, users can create a 1080×1920 Mind Bend card. The private challenge is never placed on the card. Mobile Web Share is used when available, with image + direct trial link; browser fallback saves the card and copies the link.
- **Direct shared-reset entry:** shared URLs use `?try=TS-xxx`. A recipient can open that exact ritual directly without first typing a challenge.
- **Did It Shift?:** four outcome choices (`NOT YET`, `A LITTLE`, `YES`, `A LOT`) are stored locally and are revisable per ritual.
- **Adaptive Reset DNA:** ratings are grouped into product mechanism families such as `INTERRUPT`, `GROUND`, `DISTANCE`, `CHOOSE`, and `CONNECT`. Routing gets a small bounded preference boost from prior outcomes; relevance remains dominant.
- **Reset DNA in Vault:** after three rated resets, the Vault shows the three mechanism families that have felt most useful. It explicitly states that this is not a diagnosis or personality test.
- **Discovery loop:** the ritual footer shows how many unseen resets remain in the 750 no-repeat cycle.
- **Growth instrumentation:** local events are recorded and also emitted as `thinkstill:growth` browser `CustomEvent`s so production analytics can subscribe without changing the ritual engine. Challenge text is not included in these events.

### Share Base URL

A new Framer property, **Share Base URL**, can be set to the production page URL. When blank, sharing uses the current page URL. Set this in production so `?try=TS-xxx` links always point at the live ThinkStill experience rather than a Framer preview URL.

### Growth data files

- `growth-layer-v1.json` — human-readable list of the 50 curated first-session rituals and Reset DNA family names.
- `source/ThinkStill_750_v13_FINAL_RELEASE_PERMANENT_10of10.xlsx` — the original locked workbook plus a **GROWTH LAYER** metadata sheet; ritual text is unchanged.
