#!/usr/bin/env bash
# Assembles the published site (used by .github/workflows/hushmallow-pages.yml).
#   tools/build-site.sh <out-dir> <version>
# Each deploy keeps its code and art in its own folder, v/<version>/, so a
# browser can never mix a cached old page with new code. index.html points
# into that folder, version.json names the current one (the app checks it,
# bypassing every cache, and moves itself to the newer version), and the
# old root src/app/main.js becomes a tiny forwarder for pages cached before
# this layout existed. Only the app ships: no dev tools, workbook or Python.
# Every tracked file of the repository is scanned for secrets first
# (tools/secret-scan.mjs), published or not; in an export with no .git, every
# file under the repository root. The finished site is then checked
# (tools/site/check.mjs): every file the page, its modules, its styles and its
# art tables name must be in it, and no file may hold a secret key.
#
# Sign-in (optional): the build variables SUPABASE_URL and
# SUPABASE_PUBLISHABLE_KEY (Cloudflare Pages, Production and Preview) are the
# only values published to the browser, in v/<version>/src/auth/public-config.js,
# after tools/site/auth-config.mjs has checked them (only the hushmallow1
# project, only a publishable key; a secret, another project or a malformed
# value fails the build). Neither set: { enabled: false } and the app runs as
# without accounts. HM_AUTH_MODE=dev|ci also allows a localhost server (the
# fake in tools/auth/ or a local Supabase stack); such a build only signs in
# on localhost. /auth/callback/ is written with absolute /v/<version>/ paths
# (it lives two folders down), and _headers keeps /auth/* uncached, unframed
# and referrer-free.
#
# The Privacy Policy and the Terms of Use (legal/*.html) are published at
# /legal/, addresses that never change between versions (the app, the plans
# page and the sign-up form link there: src/app/legal.js). Their styles, fonts
# and logo come from this version's folder through relative ../v/<version>/
# paths, so the GitHub Pages copy (served one folder down) works too; _headers
# gives /legal/* a strict Content-Security-Policy (no script at all).
set -euo pipefail
# the real path (-P): a linked checkout runs every node step by the path node sees
here="$(cd "$(dirname "$0")/.." && pwd -P)"
out="$1"; ver="$2"
[[ "$ver" =~ ^[0-9a-zA-Z_-]+$ ]] || { echo "bad version: $ver" >&2; exit 1; }
# Cloudflare Pages builds every push of every branch whatever it changes (the workflows filter by path),
# so a key in a doc, the server or the repository root fails here before anything is built. A checkout
# (.git at the repository root) has its tracked files scanned, and if git cannot list them (dubious
# ownership, a gitdir that is gone, no git) the build stops (exit 2); only a copy with no .git at all
# (an export, a tarball) has every file under the root read directly instead. Never skipped.
node "$here/tools/secret-scan.mjs" --source "$here/.."
# the two public sign-in values, or { enabled: false }: checked first, so a refused value never leaves a half-built site
authtmp="$(mktemp -d)"; trap 'rm -rf "$authtmp"' EXIT
node "$here/tools/site/auth-config.mjs" "$authtmp/public-config.js" "$ver" "$authtmp/_headers"
rm -rf "$out"; mkdir -p "$out/v/$ver/assets"
cp -r "$here/src" "$out/v/$ver/"
# developer pages only: the localhost labs' fixtures and the Emotion Studio
rm -rf "$out/v/$ver/src/v3/dev" "$out/v/$ver/src/studio"
# the vendored sign-in library (supabase-js; loaded only when sign-in is on and needed)
cp -r "$here/vendor" "$out/v/$ver/vendor"
cp "$authtmp/public-config.js" "$out/v/$ver/src/auth/public-config.js"
cp "$authtmp/_headers" "$out/_headers"
# every asset folder except the source art, so a new folder is never left behind
for d in "$here"/assets/*/; do n=$(basename "$d"); [ "$n" = source ] || cp -r "$d" "$out/v/$ver/assets/$n"; done
# the folders the app cannot run without, the high-res art included (D13)
for d in "$here/assets/mallows" "$here/assets/rig" "$here/assets/mallows-hires" "$here/assets/rig-hires" "$here/assets/fonts" "$here/assets/brand"; do
  [ -d "$out/v/$ver/assets/$(basename "$d")" ] || { echo "asset folder not copied: $d" >&2; exit 1; }
done
sed -e "s#href=\"src/#href=\"v/$ver/src/#g; s#src=\"src/#src=\"v/$ver/src/#g; s#href=\"assets/#href=\"v/$ver/assets/#g" \
  "$here/index.html" > "$out/index.html"
sed -e "s#\"assets/#\"v/$ver/assets/#g" "$here/manifest.webmanifest" > "$out/manifest.webmanifest"
printf '{"v":"%s"}\n' "$ver" > "$out/version.json"
mkdir -p "$out/src/app"
cp "$here/tools/site/forward.js" "$out/src/app/main.js"
touch "$out/.nojekyll"
# /auth/callback/: email links and provider sign-ins land here (absolute versioned paths)
mkdir -p "$out/auth/callback"
sed -e "s#\"\.\./\.\./src/#\"/v/$ver/src/#g; s#\"\.\./\.\./assets/#\"/v/$ver/assets/#g; s#\"\.\./\.\./vendor/#\"/v/$ver/vendor/#g" \
  "$here/auth/callback/index.html" > "$out/auth/callback/index.html"
grep -q "/v/$ver/src/auth/callback.js" "$out/auth/callback/index.html" || { echo "auth/callback/index.html was not rewritten" >&2; exit 1; }
if grep -nE '(href|src)="\.\.?/' "$out/auth/callback/index.html"; then echo "relative path left in auth/callback/index.html" >&2; exit 1; fi
# /legal/: the Privacy Policy and the Terms of Use (relative ../v/<version>/ paths: they live one folder down)
mkdir -p "$out/legal"
for f in "$here"/legal/*.html; do
  n=$(basename "$f")
  sed -e "s#\"\.\./src/#\"../v/$ver/src/#g; s#\"\.\./assets/#\"../v/$ver/assets/#g" "$f" > "$out/legal/$n"
  grep -q "\"../v/$ver/src/ui/legal.css\"" "$out/legal/$n" || { echo "legal/$n was not rewritten" >&2; exit 1; }
  if grep -nE '(href|src)="\.\./(src|assets)/' "$out/legal/$n"; then echo "unversioned path left in legal/$n" >&2; exit 1; fi
done
grep -q "v/$ver/src/app/main.js" "$out/index.html" || { echo "index.html was not rewritten" >&2; exit 1; }
if grep -nE '(href|src)="(src|assets)/' "$out/index.html"; then echo "unversioned path left in index.html" >&2; exit 1; fi
node "$here/tools/site/check.mjs" "$out" "$ver"
echo "site: $out (version $ver)"
