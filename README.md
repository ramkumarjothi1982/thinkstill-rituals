# ThinkStill Bubble Expressions

Standalone GitHub package for ThinkStill character expression assets.

## Contents

- `bubble-expressions/` — 448 WebP expression images
  - Drop: 64
  - Glitch: 64
  - Loopie: 64
  - Patch: 64
  - Rush: 64
  - Still: 64
  - Sync: 64
- `thinkstill_750_expression_map.json` — maps ThinkStill ritual states to the expression assets.

## Asset paths

Keep the folder and filenames exactly as supplied. The JSON uses flat paths such as:

`bubble-expressions/patch_E01.webp`

Do not move the character images into separate subfolders unless the JSON paths are also changed.

## Patch update

Patch assets have been normalised to the same 512 × 512 canvas/visual scale as the other bubble expressions so Patch fills the bubble consistently.

## GitHub upload

Create a separate repository for the expression assets, then upload the **contents of this ZIP** to the repository root.

Expected structure:

```text
<repo-root>/
├── README.md
├── thinkstill_750_expression_map.json
└── bubble-expressions/
    ├── drop_E01.webp
    ├── ...
    ├── patch_E01.webp
    └── ...
```
