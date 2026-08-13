# ThinkStill 750 — v40.6 Relief-First Final Release

**WHEN YOUR MIND HITS HARD, HIT THINKSTILL.**

This repository is generated directly from the locked v40.6 master workbook. It contains the **full 750 rituals** and a Vite/React app that renders the complete consumer ritual instead of stripping fields.

## What is included

- `public/data/rituals.json` — all 32 master fields for all 750 rituals.
- `public/data/app-display.json` — the 15 app-facing fields for all 750 rituals.
- `public/data/routing-map.json` — specialist keyword banks and feedback refinements.
- `public/data/worlds.json` — 7 Worlds and specialist groups.
- `public/data/feedback-engine.json` — routing / feedback contract.
- `public/data/safety-tiers.json` — safety-tier rules.
- `public/thinkstill-manifest.json` — release metadata and data paths.
- `src/App.jsx` — local routing, full ritual presentation, feedback, share, and persistent no-repeat history.
- `scripts/validate.mjs` — release-integrity validator.

## Run locally

```bash
npm install
npm run validate
npm run dev
```

## Deploy on GitHub Pages

1. Upload the **contents of this folder** to your repository root.
2. Run `npm install` and `npm run build` in GitHub Actions or your deployment service.
3. Publish the generated `dist/` folder.

Because `vite.config.js` uses `base: './'`, the build works from a GitHub Pages project path as well as a normal root domain.

## Routing behaviour

The included browser router scores the user's free text against:

- Specialist
- Moment / User Need
- Precise Pattern (backend only)
- Goal
- Mechanism
- Routing Keywords
- Specialist keyword bank
- First-Line Priority
- Previously helpful mechanisms

It then selects a **best unused ritual** from the highest-scoring candidates. Viewed IDs are persisted in `localStorage`, so closing/reopening the browser does not reset the pool. After all 750 IDs are consumed, the global pool starts a new cycle.

For a production release, you can replace the lightweight lexical router with embeddings/server-side semantic routing without changing the JSON schema or UI.

## Important safety boundary

ThinkStill supports the moment; it does not diagnose conditions, replace treatment, or provide emergency care. Tier 3 content is a support bridge and should bypass ordinary retry loops in production.

## Source

Generated from `ThinkStill_750_v40_6_RELIEF_FIRST_FINAL_RELEASE_MASTER.xlsx`.
