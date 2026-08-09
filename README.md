# ThinkStill v36.1 — FULL RITUAL COMPATIBILITY FIX

This fixes the blank/stripped ritual-body problem.

## Why the previous package failed

The previous JSON nested consumer fields under `display.*`.
Your existing chatbot can show fields such as `title` and `playTime`,
but appears to expect the ritual body at top level.

v36.1 exposes BOTH schemas.

## Recommended top-level fields

- `title`
- `playTime`
- `goal`
- `steps`
- `stepsStructured`
- `win`
- `formulaFlow`
- `safety`
- `pause`
- `disclaimer`
- `ritualText` ← complete ready-to-render consumer ritual
- `fullRitual`
- `content`

## Legacy Excel-name fields also included

- `Ritual Title`
- `Goal`
- `Goal + Steps`
- `Win / Reward`
- `Formula Flow`
- `Safety`

So existing code using the old names should continue to work.

## Important

Do NOT render:
- `internal.hook`
- `internal.gameMove`

## Fastest fix in your chatbot

If your UI wants one complete text block, render:

```js
ritual.ritualText
```

If your UI uses separate sections:

```js
ritual.title
ritual.goal
ritual.stepsStructured
ritual.win
ritual.formulaFlow
ritual.pause
ritual.disclaimer
```

## GitHub raw files

Because every file is in one folder:

```text
.../main/manifest.json
.../main/rituals.json
.../main/glitch.json
.../main/drop.json
.../main/still.json
.../main/patch.json
.../main/loopie.json
.../main/rush.json
.../main/sync.json
```

## Validate

```bash
npm run validate
npm run smoke
```
