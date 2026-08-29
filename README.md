# ThinkStill 750 — v18.1 Final Production Hardened

This package is the GitHub-ready data release generated from:

`ThinkStill_750_v18_1_FINAL_PRODUCTION_HARDENED_MASTER.xlsx`

## Production status

- 750 rituals
- 750 unique thought-engine fingerprints
- 25 SUPPORT FIRST rows
- 50 First Session rituals
- Customer display aliases separated from canonical technique names
- Cognitive-load-aware routing
- Tiered substance/craving routing
- Deterministic SUPPORT FIRST trigger metadata
- SUPPORT FIRST bypasses the game/ritual shell

## Drop-in structure

```text
public/data/
  thinkstill-manifest.json
  thinkstill-rituals.json
  thinkstill-routing.json
  thinkstill-safety.json
  thinkstill-first-session.json
  *.v18.1.json

src/lib/
  thinkstillData.ts
  thinkstillRouter.ts
  index.ts

scripts/
  validate-thinkstill.mjs

source/
  ThinkStill_750_v18_1_FINAL_PRODUCTION_HARDENED_MASTER.xlsx
```

## App integration

For a Vite/React/Next client that serves `public/` at the web root:

```ts
import { loadThinkStillData, selectThinkStillRitual } from "./lib";

const bundle = await loadThinkStillData();

const result = selectThinkStillRitual(
  "I really want drugs right now",
  bundle.rituals,
  bundle.routing,
  {
    usedIds: [],
    acuteDistress: true,
  },
);

console.log(result.ritual.displayName);
```

The loader always fetches:

```text
/data/thinkstill-manifest.json
```

and then resolves the stable browser-facing JSON paths from the manifest.

## Important safety integration

`thinkstillRouter.ts` accepts `safetyOverride`.

Your application-level safety layer should set this when a user may be at immediate risk. The router's phrase matching is an additional routing signal and is **not** a replacement for your safety classifier or emergency logic.

When `supportFirstBypass === true`, render the SUPPORT FIRST content directly. Do not show the normal GAME/RITUAL shell first.

## Substance routing order

1. SUPPORT FIRST when severe risk is detected
2. Tier 1 — Urge
3. Tier 2 — Habit / cue loop
4. Tier 3 — Deliberation, only when the user is actually deciding

Generic terms such as `drugs`, `craving`, `urge`, `nicotine`, `vaping`, `alcohol`, `cocaine`, and `cannabis` should not drop into Tier 3 decision-analysis by default.

## Validation

Run before every release:

```bash
npm run validate:thinkstill
```

The validator checks row counts, ID uniqueness, fingerprint uniqueness, SUPPORT FIRST rules, First Session ranks, Tier 3 alias leakage, and immutable data hashes.

## Versioning

Use the stable filenames in application code:

```text
/data/thinkstill-rituals.json
/data/thinkstill-routing.json
```

The versioned files are retained for auditability and immutable releases.

When publishing a future master, update both stable and versioned files together, regenerate the manifest hashes, and run validation.
