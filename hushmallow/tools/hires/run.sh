#!/usr/bin/env bash
# Re-run the whole high-res re-rig from the owner's art (see README.md).
#   tools/hires/run.sh [ids...]          (default: all seven)
# WORK (default /tmp/hushmallow-hires) holds the large intermediates.
# Step 4b needs a server on the repo root (python3 -m http.server 8000) and
# Playwright + Chromium (see lab/run.cjs); SKIP_FIT=1 keeps data/fit-*.json.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
app="$(cd "$here/../.." && pwd)"
WORK="${WORK:-/tmp/hushmallow-hires}"
ids=("$@")
mkdir -p "$WORK"
cd "$app"
python3 tools/hires/prepare.py assets/source/hires assets/mallows-hires "$WORK" ${ids[@]+"${ids[@]}"}
python3 tools/hires/measure.py "$WORK" tools/hires/data/old-registry.json ${ids[@]+"${ids[@]}"}
cp "$WORK"/measure-*.json tools/hires/data/
# derive.py merges its report into the existing one (a subset of ids keeps the rest)
[ -f "$WORK/derive-report.json" ] || cp tools/hires/data/derive-report.json "$WORK/" 2>/dev/null || true
python3 tools/hires/derive.py "$WORK" assets/rig-hires ${ids[@]+"${ids[@]}"}
cp "$WORK/derive-report.json" tools/hires/data/
python3 tools/hires/build_table.py tools/hires/data tools/hires/data/old-registry.json \
  tools/hires/data/hires-nofit.js --no-fit --asset-base=../../../assets/
if [ "${SKIP_FIT:-0}" != 1 ]; then
  for id in ${ids[@]:-glitzi zuzu boppo pipzi blubi loomi noomi}; do
    node tools/hires/lab/run.cjs fit "$id" "tools/hires/data/fit-$id.json" '' ../data/hires-nofit.js
  done
fi
# the Mallows that passed the studio check (D13): keep in step with the report
python3 tools/hires/build_table.py tools/hires/data tools/hires/data/old-registry.json \
  src/mallows/hires.js ${VERIFIED:-glitzi zuzu boppo pipzi blubi noomi}
# the res support still fits today's rig.js / mallow-touch.js / registry.js / expressions.js
node tools/hires/refresh-patch.mjs --check
node --test tests/hires.test.mjs
