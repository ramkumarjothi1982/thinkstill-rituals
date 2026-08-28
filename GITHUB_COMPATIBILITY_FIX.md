# GitHub compatibility fix

The live Framer instance may still request `manifest.json`.

This package includes `manifest.json` as an exact v13-compatible alias of `thinkstill-manifest-v13.json`.
Upload/replace `manifest.json` in the repository root alongside:

- glitch.json
- drop.json
- loopie.json
- patch.json
- rush.json
- still.json
- sync.json

This lets the existing Framer Manifest URL continue to use:

`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/manifest.json`

Alternatively, set the Framer Manifest URL directly to:

`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/thinkstill-manifest-v13.json`
