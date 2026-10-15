# Vendored supabase-js (browser build)

| | |
|---|---|
| Package | `@supabase/supabase-js` |
| Version | **2.117.2** (published 2026-09-25 10:08 UTC; pinned on 2026-10-13, 18 days after publication) |
| File | `supabase.js` = `package/dist/umd/supabase.js` from the npm tarball, byte for byte |
| sha256 | `59d39487c3589843b410322d8a3d562ce022aba1e5ccb16898ef3fb2a0da2ecd` (217,945 bytes) |
| Tarball | `https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.117.2.tgz` |
| Tarball integrity | `sha512-eSG2VKnHR+Clp1PmidZ1/weJ8PJwoybjva3L2GgKqFG4YDS1Iqmc61psKGZP5xw6OMT2O7ZorPR42PY6q1BOXg==` (matches `npm view @supabase/supabase-js@2.117.2 dist.integrity`) |
| Licence | MIT, `LICENSE` (copied from the same tarball) |

The bundle contains auth-js, postgrest-js, storage-js, functions-js and
realtime-js 2.117.2 (all MIT, same repository). It is a classic script
that defines one global, `supabase`.

## How the app uses it

* Only `src/auth/client.js` loads it, lazily, with a `<script>` element,
  and only when sign-in is configured (`src/auth/public-config.js`, written
  by `tools/build-site.sh`) **and** needed (a session is already on this
  device, or the person opens an account screen). Guests never download it.
* No CDN at run time: the file ships with the site in `v/<version>/vendor/`.
* The client is created with `global.fetch` set to a wrapper that refuses
  any URL outside the configured Supabase origin, and nothing in the app
  uses Realtime, Storage or Functions.
* `tools/site/check.mjs` fails the build if the shipped copy's sha256 is not
  the one in `manifest.json`, or `LICENSE` is missing.
  `tests/auth-config.test.mjs` checks the repository copy the same way.

## Updating

1. Pick a version published at least 14 days ago:
   `npm view @supabase/supabase-js time --json`.
2. `npm pack @supabase/supabase-js@<version>` in a scratch folder; compare
   `openssl dgst -sha512 -binary <tgz> | base64` with
   `npm view @supabase/supabase-js@<version> dist.integrity`.
3. Copy `package/dist/umd/supabase.js` and `package/LICENSE` here; update
   `manifest.json` and this table (`sha256sum supabase.js`).
4. Run `node --test hushmallow/tests/*.test.mjs` and the auth browser checks
   (see `docs/AUTH.md`).
