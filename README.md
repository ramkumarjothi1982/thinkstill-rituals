# ThinkStill 750 — v40.5.3 TRUE FINAL 100/10

This is the complete upload-ready GitHub package for the locked 750-ritual ThinkStill library.

It includes:

- all **750 complete rituals** from `TS-001` through `TS-750`
- the full consumer hierarchy: **Name → Goal → Moves → WIN → 5 TIPS → MIND BEND → Formula Flow → Safety**
- exact full ritual text and structured fields, so no ritual body is stripped
- search, world filters and moment-to-ritual matching
- a global no-repeat pool that resets only after all 750 rituals have been served
- **BETTER / A LITTLE / NOT YET** feedback routing
- different-mechanism routing after partial or failed outcomes
- Tier 3 support escalation that bypasses endless retry loops
- dark and bright themes
- device-local progress and outcome history
- mobile, desktop, print and accessibility styling
- a Framer embed code component
- offline caching after first load
- GitHub Pages deployment workflows
- automated release validation
- the locked Excel source master

## Fastest GitHub upload

1. Create a new GitHub repository.
2. Open the extracted `ThinkStill_GitHub_v40.5.3_FULL` folder.
3. Upload **everything inside the folder**, including `.github`, `assets`, `data`, `scripts`, and `source`.
4. Commit the upload to the `main` branch.
5. In GitHub, open **Settings → Pages**.
6. Under **Build and deployment**, choose **GitHub Actions**.
7. Open the **Actions** tab and wait for **Deploy ThinkStill to GitHub Pages** to finish.

Your live URL will normally be:

`https://YOUR-GITHUB-NAME.github.io/YOUR-REPOSITORY-NAME/`

## Test before uploading

Install Node.js 18 or newer, open a terminal inside this folder, then run:

```bash
npm test
npm run dev
```

Open `http://127.0.0.1:4173`.

Do not double-click `index.html`: browsers block JSON loading from `file://`. Use the included local server or GitHub Pages.

## Release contract

`manifest.json` is the package entry point and release contract. It identifies the correct data files, locked version, row count, display order, integrity hash and consumer-rendering rules.

`data/rituals.json` contains both:

- exact `ritualText` for lossless preservation
- structured fields used by the polished app interface

The interface renders structured fields once and uses `ritualText` for full-copy export. This prevents duplicated Goal, Formula Flow, WIN or title lines.

## Access note

A public GitHub Pages repository is public. A secret Circle button URL is not real access control. If the site must be Circle-members-only, put this same static package behind authenticated hosting or an access proxy. Do not rely on a hidden link.

## Repository map

| Path | Purpose |
| --- | --- |
| `index.html` | Complete app shell and consumer ritual layout |
| `styles.css` | Responsive dark/bright product styling |
| `app.js` | Matching, no-repeat routing, feedback, search and local history |
| `manifest.json` | Source-of-truth package entry point |
| `data/rituals.json` | All 750 complete rituals |
| `data/routing.json` | Worlds, feedback and no-repeat rules |
| `sw.js` | Offline cache |
| `site.webmanifest` | Installable web-app metadata |
| `scripts/validate.mjs` | Strict 750-ritual release gate |
| `scripts/serve.mjs` | Dependency-free local server |
| `framer/ThinkStillEmbed.tsx` | Framer code component for the deployed app |
| `.github/workflows/` | Validation and GitHub Pages deployment |
| `source/` | Locked v40.5.3 Excel release master |

## Safety

ThinkStill is a self-help product, not emergency or medical care. Ritual-specific PAUSE text is preserved exactly. High-risk Tier 3 routes change the support type instead of creating an endless ritual retry loop.

## Ownership

The app, ritual data, brand copy and source workbook are proprietary. See `LICENSE-PROPRIETARY.md`.
