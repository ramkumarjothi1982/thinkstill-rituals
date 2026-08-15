# ThinkStill 750 — v58.19 GitHub Package — ONE FOLDER

This package was generated directly from the locked workbook:

`ThinkStill_750_v58_19_FINAL_10of10_BESPOKE_GOAL_WIN_MINDBEND_RELEASE_MASTER(1).xlsx`

## Release lock

- Rituals: **750**
- IDs: **TS-001 → TS-750**
- APP DISPLAY fields: preserved from the workbook
- Routing/safety/control metadata: preserved from RELEASE MASTER
- APP DISPLAY ↔ RELEASE MASTER parity check: **PASS**
- Five tips per ritual: **PASS**
- **No subfolders:** every GitHub file is in this single directory

## Files

- `rituals.json` — frontend/user-facing ritual content only
- `routing.json` — backend routing, safety and control metadata
- `rituals.full.json` — consumer + routing data combined per ritual
- `routing-index.json` — lookup indexes by world, visual mode, specialist, precise pattern and mechanism family
- `index.js` — zero-dependency ES module exports and ID lookup helpers
- `selector.js` — optional reference selector using the locked routing metadata
- `ritual.schema.json` — consumer ritual JSON Schema
- `thinkstill-manifest-v17.json` — release manifest and file hashes
- `validate.mjs` — dependency-free release validation
- `release-stats.json` — release distributions
- `ThinkStill_750_v58_19_FINAL_10of10_BESPOKE_GOAL_WIN_MINDBEND_RELEASE_MASTER(1).xlsx` — exact source workbook
- `APP_INTEGRATION_CODE.txt` — quick integration reference
- `SHA256SUMS.txt` — package file hashes
- `package.json` — Node package metadata and validation command
- `.gitignore` — Git exclusions

## Use

```js
import { getRitual } from "./index.js";

const ritual = getRitual("TS-001");
console.log(ritual);
```

Optional selector:

```js
import { selectRitual } from "./selector.js";

const result = selectRitual({
  precisePattern: "Catastrophising",
  usedIds: ["TS-003"]
});
```

## Validate before deployment

```bash
npm run validate
```

Expected result: `PASS: 750/750 consumer rituals and routing rows validated`.

## Important integration note

`rituals.json` is the clean client-facing payload. Keep `routing.json` server-side if you do not want internal routing/safety metadata exposed to users.

The supplied selector is a reference implementation only. It does not alter the ritual content or workbook metadata.
