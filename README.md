# ThinkStill v36 — ALL FILES IN ONE FOLDER

This package is intentionally **flat**: every GitHub file sits in the repository root.

## Upload to GitHub

Upload the **contents of this folder directly to the root of your GitHub repository**.

Your repository should look like this:

```text
manifest.json
rituals.json
routing-index.json
glitch.json
drop.json
still.json
patch.json
loopie.json
rush.json
sync.json
RedirectGlitch.tsx
ritual-loader.js
consumer-view.js
validate.mjs
smoke-test.mjs
consumer-ritual-card.html
package.json
README.md
SHA256SUMS.txt
.gitignore
ThinkStill_400_Rituals_v36_FINAL_Clean_Consumer_MASTER(3).xlsx
```

## Main raw GitHub links

After upload:

```text
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/manifest.json
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/rituals.json
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/glitch.json
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/drop.json
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/still.json
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/patch.json
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/loopie.json
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/rush.json
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/sync.json
```

## Consumer display order

Render only:

1. Ritual Title
2. Goal
3. Numbered ritual steps
4. Win / Reward
5. Formula Flow
6. Safety

Do not render:

- internal Hook
- internal Game Move

## Framer

Use:

`RedirectGlitch.tsx`

Default gate URL:

`https://vibyfy-gate-worker.vibyfy-chat.workers.dev/gate/glitch`

## Validation

```bash
npm run validate
npm run smoke
```

The package contains:

- 400 rituals
- 7 bubbles
- 22 triggers
- 63 precise patterns
