# ThinkStill v6 — 750 Rituals + Mind Bend — FINAL GitHub Package

This package is generated from the locked **ThinkStill 750 v6 10/10** workbook. The 750 core games are unchanged; every ritual includes its final bespoke **MIND BEND** inside the full ritual output.

## Upload

Upload **every file in this folder to the root of the GitHub repository**. Keep filenames unchanged.

Existing ThinkStill raw manifest URL:

`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json`

For another repository:

`https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/refs/heads/main/manifest.json`

## Required by the Framer component

- `manifest.json`
- `rituals.json`
- `routing.json`
- `ThinkStill_UnifiedChat_v6_10of10_FINAL_RELEASE.tsx`

The seven bubble files are also shipped for direct/partial loading:

- `rituals_glitch.json`
- `rituals_drop.json`
- `rituals_still.json`
- `rituals_patch.json`
- `rituals_loopie.json`
- `rituals_rush.json`
- `rituals_sync.json`

## Runtime ritual contract

Each ritual is stored as:

**GAME → MISSION → ONE RULE → PLAY → TWIST → WIN → MIND BEND → SUPPORT FIRST (when present)**

The runtime JSON also contains structured versions of those sections, so the UI does not need to scrape the full text.

### Mind Bend

- Mind Bend is part of the displayed ritual.
- It appears immediately after WIN.
- Safety/support copy appears after Mind Bend when present.
- There is no feedback-question panel in this v6 component.
- There is no Tips payload or Tips renderer.

## Library counts

- Total rituals: **750**
- GLITCH: **144**
- DROP: **114**
- STILL: **106**
- PATCH: **171**
- LOOPIE: **71**
- RUSH: **51**
- SYNC: **93**
- Support-first rituals: **25**

## Automatic routing

The v6 router uses the new library instead of the older 22→63 release taxonomy.

Selection path:

**user text → safety gate → intent aliases → Best For categories → ritual keyword overlap → highest-scoring globally unused ritual**

Rules:

- automatic routing only;
- no manual bubble selector;
- semantic/category fit wins before variety;
- recent-bubble penalty is only a small tie-breaker;
- no ritual repeats until the 750-ID browser-local cycle is exhausted;
- RESET CONSOLE clears that cycle;
- Back returns to the previous served ritual;
- Next serves the next best unused ritual for the last user signal;
- safety intent stays inside SUPPORT FIRST rows rather than routing inward.

Browser storage key: `thinkstill_v6_seen_ids`.

## Framer UI in this package

`ThinkStill_UnifiedChat_v6_10of10_FINAL_RELEASE.tsx` is a self-contained Framer Code Component with:

- `RITUAL` top-left;
- `RESET CONSOLE` centred;
- separate **ENTER** button;
- microphone icon input;
- **Back** and **Next** arrows on equal-width sides of the ritual card;
- no feedback question;
- bubble name + play time shown inside the ritual;
- bubble-specific avatar controls;
- avatar Size / X / Y controls in Framer;
- 5 transition media slots per bubble (35 total);
- transition video/image shown **before** the ritual;
- circular crop toggle, transition size and crop zoom controls;
- exact video play-time control; 0 seconds means allow the source video to finish naturally.

Transition media and avatar files are intentionally not hard-coded into GitHub. Keep/set them through the Framer property controls.

## Static GitHub Pages tester

The package also includes a no-build browser tester:

- `index.html`
- `styles.css`
- `app.js`
- `thinkstill-loader.js`
- `thinkstill-router.js`
- `media-config.json`

For GitHub Pages: **Settings → Pages → Deploy from branch → main → /(root)**.

The static tester uses `media-config.json` for optional avatars/transition URLs. Framer uses its own property controls instead.

## Other release files

- `SCHEMA.json` — ritual JSON schema
- `routing.json` — automatic routing config + aliases
- `PACKAGE_AUDIT.json` — package integrity/results
- `CHECKSUMS.sha256` — SHA-256 hashes for the package
- `VERSION.txt` — release marker
- `ThinkStill_750_v6_10of10_FULL_RITUALS_WITH_MIND_BEND.xlsx` — locked source workbook
- `.txt` copy of the Framer component for easy copy/paste

## Safety boundary

ThinkStill is a brief self-help ritual interface. SUPPORT FIRST rows deliberately route toward real-world people, clinicians, pharmacists, staffed settings or emergency services where the underlying ritual specifies that. The app must not replace urgent medical, mental-health or emergency assessment.
