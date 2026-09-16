# ThinkStill v20.3 deployment

1. Replace the existing ThinkStill data files with the v20.3 files.
2. For a web app using `/data/...`, copy the contents of `public/data/` to the app's `public/data/`.
3. Use `thinkstill-modes.json` (or each ritual's nested `modes`) for the Intensity selector.
4. Route first, then apply the selected mode.
5. Support First bypasses intensity.
6. Validate before release with `node scripts/validate-thinkstill.mjs`.

Do not render `openingLine` twice: it is already the first line of `ritualCard`.
