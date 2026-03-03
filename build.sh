#!/bin/bash
# SQL Quest Production Build Script
# Usage: ./build.sh

echo "🔨 Building SQL Quest for production..."
echo ""

# Create dist folder
mkdir -p dist

# Copy HTML
cp index.html dist/

# Minify JavaScript data files
echo "📦 Minifying data files..."

for file in config.js datasets.js challenges.js exercises.js lessons.js daily-challenges.js mock-interviews.js thirty-day-challenge.js curriculum.js thirty-day-complete-1.js thirty-day-complete-2.js; do
  if [ -f "$file" ]; then
    npx -y terser "$file" -c -m -o "dist/$file" 2>/dev/null || cp "$file" "dist/$file"
    original=$(wc -c < "$file")
    minified=$(wc -c < "dist/$file")
    savings=$((100 - minified * 100 / original))
    echo "  ✓ $file: $(numfmt --to=iec $original) → $(numfmt --to=iec $minified) (-${savings}%)"
  fi
done

# Copy app.jsx (Babel compiles it in browser)
cp app.jsx dist/

echo ""
echo "📊 Build Summary:"
echo ""

# Calculate total sizes
original_total=0
minified_total=0

for file in dist/*.js; do
  size=$(wc -c < "$file")
  minified_total=$((minified_total + size))
done

for file in *.js; do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file")
    original_total=$((original_total + size))
  fi
done

echo "  Original: $(numfmt --to=iec $original_total)"
echo "  Minified: $(numfmt --to=iec $minified_total)"
echo "  Savings:  $((100 - minified_total * 100 / original_total))%"
echo ""
echo "✅ Build complete! Files are in ./dist/"
echo ""
echo "To deploy:"
echo "  1. Upload contents of ./dist/ to your web server"
echo "  2. Or: cd dist && npx serve"
