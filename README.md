# ThinkStill v37.9 — Full Ritual Presenter

GitHub-ready, one-folder static web app generated from **ThinkStill_400_Rituals_v37_9_TRUE_ONE_OF_ONE_WIN_LOCKED_MASTER**.

## What is included

- `index.html` — mobile-first ThinkStill ritual UI
- `styles.css` — dark/light presentation skin
- `app.js` — automatic matching + browser no-repeat memory
- `rituals.json` — all **400 complete consumer rituals**
- `manifest.json` — package metadata and file map
- Bubble JSON files — `glitch.json`, `drop.json`, `still.json`, `patch.json`, `loopie.json`, `rush.json`, `sync.json`
- `404.html` — GitHub Pages fallback
- `.nojekyll` — prevents Jekyll processing

## Ritual display contract

The UI renders only the consumer-facing sequence from the workbook's **APP DISPLAY** sheet:

**TITLE → GOAL → NUMBERED RITUAL → WIN → 5 RITUAL-MATCHED SUPPORT MOVES → FORMULA FLOW → SAFETY**

Internal Hook/Game Move fields are **not rendered**.

## Publish on GitHub Pages

1. Create or open your GitHub repository.
2. Upload **every file in this folder to the repository root**. Do not upload the ZIP itself.
3. Commit the files.
4. GitHub → **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select your main branch and `/ (root)`, then Save.
7. Open the GitHub Pages URL GitHub gives you.

## No-repeat behaviour

Viewed ritual IDs are stored in browser `localStorage` under `thinkstill_v37_9_seen`. The same browser will not repeat a ritual until all 400 have been served. At 400/400, the pool resets automatically.

## Bubble counts

- DROP: 57
- GLITCH: 58
- LOOPIE: 57
- PATCH: 57
- RUSH: 57
- STILL: 57
- SYNC: 57

## Important

Opening `index.html` by double-clicking it can cause browsers to block `fetch('rituals.json')`. Test via GitHub Pages or a local web server instead.
