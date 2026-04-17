#!/usr/bin/env bash
# Render 1200x628 ad creatives from scripts/ad-*-template.html using headless
# Chrome. Targets: ads.course-grad.png (matches /after-the-sql-course/) and
# ads.bootcamp-grad.png (matches /after-bootcamp/).
#
# Requires Google Chrome and a local server on :4321 serving public/.
# Usage: bash scripts/build-ads.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
AD_DIR="$ROOT/public/ads"

if [ ! -x "$CHROME" ]; then
  echo "✗ Chrome not found at $CHROME" >&2
  exit 1
fi
if ! curl -s -o /dev/null --max-time 2 http://localhost:4321/ ; then
  echo "✗ No server on :4321. Start: python3 -m http.server 4321 --directory public" >&2
  exit 1
fi

mkdir -p "$AD_DIR"

render_one() {
  local template="$1"
  local out="$2"
  local staged_name="__ad_staging__.html"
  local staged="$ROOT/public/$staged_name"
  local raw="/tmp/sqlquest-ad-raw.png"

  cp "$template" "$staged"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size=1200,800 --virtual-time-budget=3000 \
    --screenshot="$raw" "http://localhost:4321/$staged_name" >/dev/null 2>&1

  python3 - "$raw" "$out" <<'PY'
import sys
from PIL import Image
im = Image.open(sys.argv[1])
im.crop((0, 0, 1200, 628)).save(sys.argv[2])
PY

  rm -f "$staged" "$raw"
  echo "✓ $out ($(wc -c < "$out" | tr -d ' ') bytes)"
}

render_one "$ROOT/scripts/ad-course-grad-template.html"   "$AD_DIR/course-grad.png"
render_one "$ROOT/scripts/ad-bootcamp-grad-template.html" "$AD_DIR/bootcamp-grad.png"
