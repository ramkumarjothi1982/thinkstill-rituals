#!/usr/bin/env bash
# Assembles the published site (used by .github/workflows/hushmallow-pages.yml).
#   tools/build-site.sh <out-dir> <version>
# Each deploy keeps its code and art in its own folder, v/<version>/, so a
# browser can never mix a cached old page with new code. index.html points
# into that folder, version.json names the current one (the app checks it,
# bypassing every cache, and moves itself to the newer version), and the
# old root src/app/main.js becomes a tiny forwarder for pages cached before
# this layout existed. Only the app ships: no dev tools, workbook or Python.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
out="$1"; ver="$2"
[[ "$ver" =~ ^[0-9a-zA-Z_-]+$ ]] || { echo "bad version: $ver" >&2; exit 1; }
rm -rf "$out"; mkdir -p "$out/v/$ver/assets"
cp -r "$here/src" "$out/v/$ver/"
rm -rf "$out/v/$ver/src/v3/dev"
cp -r "$here/assets/mallows" "$here/assets/rig" "$here/assets/mallows-hires" "$here/assets/rig-hires" "$here/assets/fonts" "$here/assets/brand" "$out/v/$ver/assets/"
sed -e "s#href=\"src/#href=\"v/$ver/src/#g; s#src=\"src/#src=\"v/$ver/src/#g; s#href=\"assets/#href=\"v/$ver/assets/#g" \
  "$here/index.html" > "$out/index.html"
sed -e "s#\"assets/#\"v/$ver/assets/#g" "$here/manifest.webmanifest" > "$out/manifest.webmanifest"
printf '{"v":"%s"}\n' "$ver" > "$out/version.json"
mkdir -p "$out/src/app"
cp "$here/tools/site/forward.js" "$out/src/app/main.js"
touch "$out/.nojekyll"
grep -q "v/$ver/src/app/main.js" "$out/index.html" || { echo "index.html was not rewritten" >&2; exit 1; }
if grep -nE '(href|src)="(src|assets)/' "$out/index.html"; then echo "unversioned path left in index.html" >&2; exit 1; fi
echo "site: $out (version $ver)"
