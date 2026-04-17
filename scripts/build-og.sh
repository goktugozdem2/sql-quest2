#!/usr/bin/env bash
# Rebuild public/og-image.png from scripts/og-render-template.html using
# headless Chrome. Run whenever the OG copy changes.
#
# Requires: Google Chrome installed at the macOS default location, a local
# HTTP server running on :4321 serving public/ (the launch.json config).
# Usage: bash scripts/build-og.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TEMPLATE_SRC="$ROOT/scripts/og-render-template.html"
TEMPLATE_DEST="$ROOT/public/og-render.html"
OUT="$ROOT/public/og-image.png"
RAW="/tmp/sqlquest-og-raw.png"

if [ ! -x "$CHROME" ]; then
  echo "✗ Chrome not found at $CHROME" >&2
  exit 1
fi
if [ ! -f "$TEMPLATE_SRC" ]; then
  echo "✗ Template missing: $TEMPLATE_SRC" >&2
  exit 1
fi

# Check local server
if ! curl -s -o /dev/null --max-time 2 http://localhost:4321/ ; then
  echo "✗ No server on :4321. Start with: python3 -m http.server 4321 --directory public" >&2
  exit 1
fi

# Stage template into public/ so the server serves it, then delete after.
cp "$TEMPLATE_SRC" "$TEMPLATE_DEST"
trap 'rm -f "$TEMPLATE_DEST" "$RAW"' EXIT

# Render at 1200x800 (headless chrome's viewport reports ~20-40 fewer visible
# pixels than --window-size asks for, so we pad), then PIL-crop to 1200x630.
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1200,800 --virtual-time-budget=3000 \
  --screenshot="$RAW" "http://localhost:4321/og-render.html" >/dev/null 2>&1

python3 - <<PY
from PIL import Image
im = Image.open("$RAW")
im.crop((0, 0, 1200, 630)).save("$OUT")
PY

echo "✓ $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
