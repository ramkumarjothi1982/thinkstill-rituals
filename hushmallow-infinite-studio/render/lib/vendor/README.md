# Vendored third-party code

| File | What | Version | Source | License |
|---|---|---|---|---|
| `acorn.mjs` | Acorn, the ECMAScript parser (ESM build, unmodified) | 8.18.0 | `/opt/node-tools/node_modules/acorn/dist/acorn.mjs` on the studio machine (no network install); sha256 `953573b8fdab71599749ea5f2b33d3e760c2116178f9423ee7458dbe39d59453` | MIT, `acorn.LICENSE` |

Acorn is used by `render/lib/determinism-scan.mjs`, the static guard that keeps
wall-clock time and unseeded randomness out of `engine/` and `composer/`. A real
parser is what makes that guard sound against spelling tricks: identifier
escapes are decoded, regex literals and division can never be confused, and
code that does not parse is itself a finding.

Do not edit vendored files. To upgrade, replace the file with another release's
`dist/acorn.mjs`, update this table, and run `npm run test:guard`.
